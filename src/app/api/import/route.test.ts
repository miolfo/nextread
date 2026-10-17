import { beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/import/route";

const { getUser, from, insert, select, single } = vi.hoisted(() => {
  const single = vi.fn();
  const query = {
    insert: vi.fn(),
    select: vi.fn(),
    single,
  };
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return {
    getUser: vi.fn(),
    from: vi.fn(() => query),
    insert: query.insert,
    select: query.select,
    single,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

it("counts parsed read books and returns the database id", async () => {
  single.mockResolvedValue({ data: { id: "actual-import-id" }, error: null });
  const form = new FormData();
  form.append(
    "file",
    new Blob([
      [
        "Title,Author,Exclusive Shelf",
        "Read book,Author,read",
        "Unread book,Author,to-read",
        "Another read book,Author,read",
      ].join("\n"),
    ]),
    "books.csv",
  );

  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "actual-import-id" });
  expect(from).toHaveBeenCalledWith("import_runs");
  expect(insert).toHaveBeenCalledWith({
    user_id: "user-1",
    source: "goodreads",
    original_filename: "books.csv",
    status: "received",
    book_count: 2,
  });
  expect(JSON.stringify(insert.mock.calls)).not.toContain("Read book");
  expect(select).toHaveBeenCalledWith("id");
  expect(single).toHaveBeenCalledOnce();
});

it("creates an import run with a null count when the CSV cannot be parsed", async () => {
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
  expect(insert).toHaveBeenCalledWith({
    user_id: "user-1",
    source: "goodreads",
    original_filename: "books.csv",
    status: "received",
    book_count: null,
  });
  expect(warn).toHaveBeenCalledWith("Unable to parse uploaded Goodreads CSV.");
  warn.mockRestore();
});

it("returns a server error when inserting the import run fails", async () => {
  const databaseError = {
    code: "42501",
    message: "Insert denied for uploaded-file.csv and user-123",
    details: "Policy rejected uploaded-file.csv for user-123",
    hint: "Check the import_runs policy for user-123",
  };
  single.mockResolvedValue({
    data: null,
    error: databaseError,
  });
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
  const loggedArgs = JSON.stringify(errorLog.mock.calls);
  expect(loggedArgs).not.toContain(databaseError.message);
  expect(loggedArgs).not.toContain(databaseError.details);
  expect(loggedArgs).not.toContain(databaseError.hint);
  expect(loggedArgs).not.toContain("uploaded-file.csv");
  expect(loggedArgs).not.toContain("user-123");
  expect(loggedArgs).not.toContain("books.csv");
  expect(loggedArgs).not.toContain("user-1");
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
