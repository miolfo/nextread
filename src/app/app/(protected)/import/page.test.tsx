import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ImportPage from "@/app/app/(protected)/import/page";

const { from, runQuery, booksQuery, range } = vi.hoisted(() => ({
  from: vi.fn(),
  runQuery: {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  },
  booksQuery: {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
  },
  range: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/app/import",
  useRouter: () => ({ replace: vi.fn() }),
}));

from.mockImplementation((table: string) =>
  table === "import_runs" ? runQuery : booksQuery,
);
runQuery.select.mockReturnValue(runQuery);
runQuery.eq.mockReturnValue(runQuery);
booksQuery.select.mockReturnValue(booksQuery);
booksQuery.eq.mockReturnValue(booksQuery);
booksQuery.order.mockReturnValue(booksQuery);
booksQuery.range.mockImplementation(range);

beforeEach(() => {
  vi.clearAllMocks();
  from.mockImplementation((table: string) =>
    table === "import_runs" ? runQuery : booksQuery,
  );
  runQuery.select.mockReturnValue(runQuery);
  runQuery.eq.mockReturnValue(runQuery);
  booksQuery.select.mockReturnValue(booksQuery);
  booksQuery.eq.mockReturnValue(booksQuery);
  booksQuery.order.mockReturnValue(booksQuery);
  booksQuery.range.mockImplementation(range);
});

it("shows the import step without importId", async () => {
  const importStep = await ImportPage({ searchParams: Promise.resolve({}) });
  render(importStep);
  expect(screen.getByRole("link", { name: "Next Read" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(
    screen.getByRole("heading", { name: "Import your Goodreads data" }),
  ).toBeInTheDocument();
  expect(from).not.toHaveBeenCalled();
});

it("paginates books to calculate totals and include later latest reads", async () => {
  runQuery.maybeSingle.mockResolvedValue({ data: { id: "123" }, error: null });
  const initial = Array.from({ length: 1000 }, (_, index) => ({
    id: `book-${String(index).padStart(4, "0")}`,
    title: `Book ${index}`,
    author: "Shared Author",
    my_rating: "5",
    date_read: "01/01/2020",
  }));
  range
    .mockResolvedValueOnce({ data: initial, error: null })
    .mockResolvedValueOnce({
      data: [
        {
          id: "book-latest",
          title: "Record after 1,000",
          author: "Shared Author",
          my_rating: "4",
          date_read: "12/31/2025",
        },
      ],
      error: null,
    });

  const page = await ImportPage({
    searchParams: Promise.resolve({ importId: "123" }),
  });
  render(page);
  expect(range).toHaveBeenNthCalledWith(1, 0, 999);
  expect(range).toHaveBeenNthCalledWith(2, 1000, 1999);
  expect(screen.getAllByText("1001")).toHaveLength(2);
  expect(screen.getByText("4 out of 5 stars")).toBeInTheDocument();
  expect(screen.getByText("Record after 1,000")).toBeInTheDocument();
});

it("shows unavailable for an import run not visible under RLS", async () => {
  runQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  const page = await ImportPage({
    searchParams: Promise.resolve({ importId: "missing" }),
  });
  render(page);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Import data is currently unavailable",
  );
  expect(range).not.toHaveBeenCalled();
});
