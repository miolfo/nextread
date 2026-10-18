import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/import/route";

const { getUser, from, runInsert, select, single, booksInsert, runDelete, eq } =
  vi.hoisted(() => {
    const single = vi.fn();
    const runInsert = vi.fn();
    const select = vi.fn();
    const booksInsert = vi.fn();
    const runDelete = vi.fn();
    const eq = vi.fn();
    const runQuery = { insert: runInsert, select, single, delete: runDelete };
    const booksQuery = { insert: booksInsert };
    runInsert.mockReturnValue(runQuery);
    select.mockReturnValue(runQuery);
    runDelete.mockReturnValue({ eq });
    return {
      getUser: vi.fn(),
      from: vi.fn((table: string) =>
        table === "import_runs" ? runQuery : booksQuery,
      ),
      runInsert,
      select,
      single,
      booksInsert,
      runDelete,
      eq,
    };
  });

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  booksInsert.mockResolvedValue({ error: null });
});

it("creates an import run and bulk inserts mapped parsed read books", async () => {
  single.mockResolvedValue({ data: { id: "actual-import-id" }, error: null });
  const form = new FormData();
  form.append(
    "file",
    new Blob([
      [
        "Title,Author,Additional Authors,ISBN,ISBN13,My Rating,Original Publication Year,Date Read,Exclusive Shelf",
        'Read book,Author,Other Author,"=""12345""","=""9780000001234""",5,2001,2024/01/02,read',
        "Unread book,Author,,,,,,,to-read",
        "Another read book,Author,,,,,,,read",
      ].join("\n"),
    ]),
    "books.csv",
  );

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "actual-import-id" });
  expect(from).toHaveBeenNthCalledWith(1, "import_runs");
  expect(runInsert).toHaveBeenCalledWith({
    user_id: "user-1",
    source: "goodreads",
    original_filename: "books.csv",
    status: "received",
    book_count: 2,
  });
  expect(from).toHaveBeenNthCalledWith(2, "imported_books");
  expect(booksInsert).toHaveBeenCalledWith([
    {
      import_run_id: "actual-import-id",
      title: "Read book",
      author: "Author",
      additional_authors: "Other Author",
      isbn: "12345",
      isbn13: "9780000001234",
      my_rating: "5",
      original_publication_year: "2001",
      date_read: "2024/01/02",
    },
    {
      import_run_id: "actual-import-id",
      title: "Another read book",
      author: "Author",
      additional_authors: "",
      isbn: "",
      isbn13: "",
      my_rating: "",
      original_publication_year: "",
      date_read: "",
    },
  ]);
  expect(select).toHaveBeenCalledWith("id");
  expect(single).toHaveBeenCalledOnce();
});

it("creates an import run with a null count and no books when CSV parsing fails", async () => {
  single.mockResolvedValue({ data: { id: "actual-import-id" }, error: null });
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const form = new FormData();
  form.append(
    "file",
    new Blob(['Title,Author\n"Unclosed title,Author']),
    "books.csv",
  );

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "actual-import-id" });
  expect(runInsert).toHaveBeenCalledWith({
    user_id: "user-1",
    source: "goodreads",
    original_filename: "books.csv",
    status: "received",
    book_count: null,
  });
  expect(booksInsert).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledWith("Unable to parse uploaded Goodreads CSV.");
  warn.mockRestore();
});

it("returns 500 and cleans up the import run when book insertion fails", async () => {
  single.mockResolvedValue({ data: { id: "actual-import-id" }, error: null });
  const databaseError = {
    code: "42501",
    message: "Rejected private book data",
    details: "Private details",
    hint: "Private hint",
  };
  booksInsert.mockResolvedValue({ error: databaseError });
  eq.mockResolvedValue({ error: null });
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const form = new FormData();
  form.append(
    "file",
    new Blob(["Title,Author,Exclusive Shelf\nRead book,Author,read"]),
    "books.csv",
  );

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Unable to create import" });
  expect(runDelete).toHaveBeenCalledOnce();
  expect(eq).toHaveBeenCalledWith("id", "actual-import-id");
  expect(errorLog).toHaveBeenCalledWith("Unable to insert imported books", {
    operation: "insert",
    table: "imported_books",
    code: databaseError.code,
  });
  const logged = JSON.stringify(errorLog.mock.calls);
  expect(logged).not.toContain(databaseError.message);
  expect(logged).not.toContain(databaseError.details);
  expect(logged).not.toContain(databaseError.hint);
  errorLog.mockRestore();
});

it("returns a server error when inserting the import run fails", async () => {
  const databaseError = {
    code: "42501",
    message: "Insert denied for uploaded-file.csv and user-123",
    details: "Policy rejected uploaded-file.csv for user-123",
    hint: "Check the import_runs policy for user-123",
  };
  single.mockResolvedValue({ data: null, error: databaseError });
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  const form = new FormData();
  form.append("file", new Blob(["content"]), "books.csv");

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: "Unable to create import" });
  expect(errorLog).toHaveBeenCalledWith("Unable to create import run", {
    operation: "insert",
    table: "import_runs",
    code: databaseError.code,
  });
  const logged = JSON.stringify(errorLog.mock.calls);
  expect(logged).not.toContain(databaseError.message);
  expect(logged).not.toContain(databaseError.details);
  expect(logged).not.toContain(databaseError.hint);
  expect(logged).not.toContain("books.csv");
  expect(logged).not.toContain("user-1");
  errorLog.mockRestore();
});

it("rejects requests without a file", async () => {
  const response = await POST({
    formData: async () => new FormData(),
  } as Request);

  expect(response.status).toBe(400);
  expect(from).not.toHaveBeenCalled();
});

it("returns 401 before reading an unauthenticated upload", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const formData = vi.fn();

  const response = await POST({ formData } as unknown as Request);

  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
  expect(formData).not.toHaveBeenCalled();
  expect(from).not.toHaveBeenCalled();
});
