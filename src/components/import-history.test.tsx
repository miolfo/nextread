import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import ImportsPage from "@/app/app/(protected)/history/page";
import { ImportHistory } from "@/components/import-history";

const {
  mockFrom,
  mockRuns,
  mockIn,
  mockFilter,
  mockRunOrder,
  mockBookOrder,
  mockRecommendations,
  mockRecommendationOrder,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRuns: vi.fn(),
  mockIn: vi.fn(),
  mockFilter: vi.fn(),
  mockRunOrder: vi.fn(),
  mockBookOrder: vi.fn(),
  mockRecommendations: vi.fn(),
  mockRecommendationOrder: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mockFrom }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/history",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const imports = [
  {
    id: "run-uuid-1",
    original_filename: "my-goodreads-library.csv",
    created_at: "2026-10-14T10:24:00.000Z",
  },
  {
    id: "run-uuid-2",
    original_filename: "older-library.csv",
    created_at: "2025-01-03T14:12:00.000Z",
  },
];

const books = [
  { import_run_id: "run-uuid-1", author: "Ursula Le Guin", my_rating: "5" },
  { import_run_id: "run-uuid-1", author: "Octavia Butler", my_rating: "3" },
  { import_run_id: "run-uuid-1", author: "Ursula Le Guin", my_rating: "" },
  { import_run_id: "run-uuid-2", author: "Octavia Butler", my_rating: "6" },
  { import_run_id: "run-uuid-2", author: "Terry Pratchett", my_rating: "2" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockRuns.mockResolvedValue({ data: imports, error: null });
  mockRecommendations.mockResolvedValue({ data: [], error: null });
  mockIn.mockResolvedValue({ data: books, error: null });
  mockRunOrder.mockImplementation(() => ({
    order: mockRunOrder,
    range: mockRuns,
  }));
  mockRecommendationOrder.mockImplementation(() => ({
    order: mockRecommendationOrder,
    range: mockRecommendations,
  }));
  mockBookOrder.mockImplementation(() => ({ range: mockIn }));
  mockFilter.mockImplementation(() => ({ order: mockBookOrder }));
  mockFrom.mockImplementation((table: string) =>
    table === "recommendations"
      ? {
          select: (columns: string) => {
            expect(columns).toContain("import_runs(original_filename)");
            return { order: mockRecommendationOrder };
          },
        }
      : table === "import_runs"
        ? { select: () => ({ order: mockRunOrder }) }
        : { select: () => ({ in: mockFilter }) },
  );
});

it("renders actual import records and aggregates stored book data", async () => {
  render(await ImportsPage());

  expect(mockFrom).toHaveBeenNthCalledWith(1, "recommendations");
  expect(mockFrom).toHaveBeenNthCalledWith(2, "import_runs");
  expect(mockFrom).toHaveBeenNthCalledWith(3, "imported_books");
  expect(mockFilter).toHaveBeenCalledWith("import_run_id", [
    "run-uuid-1",
    "run-uuid-2",
  ]);
  expect(mockRuns).toHaveBeenCalledWith(0, 999);
  expect(mockIn).toHaveBeenCalledWith(0, 999);
  expect(mockRunOrder).toHaveBeenNthCalledWith(1, "created_at", {
    ascending: false,
  });
  expect(mockRunOrder).toHaveBeenNthCalledWith(2, "id", { ascending: true });
  expect(mockBookOrder).toHaveBeenCalledWith("id", { ascending: true });
  expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Import another Goodreads file" }),
  ).toHaveAttribute("href", "/app/import");
  expect(screen.getByRole("link", { name: "History" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  const summary = screen.getByRole("region", { name: "Import summary" });
  expect(within(summary).getByText("5")).toBeInTheDocument();
  expect(within(summary).getAllByText("3", { selector: "p" })).toHaveLength(2);
  expect(within(summary).getByText("3.3")).toBeInTheDocument();
  expect(screen.queryByText("Marked as read")).not.toBeInTheDocument();
  expect(screen.queryByText("Total imports")).not.toBeInTheDocument();
  expect(screen.queryByText("Top genres")).not.toBeInTheDocument();

  const table = screen.getByRole("table");
  const headers = within(table).getAllByRole("columnheader");
  expect(headers.map((header) => header.textContent)).toEqual([
    "File name",
    "Imported",
    "Books",
    "Rated",
    "Average rating",
    "Authors",
    "Action",
  ]);
  for (const header of headers.slice(0, -1)) {
    expect(header).not.toHaveClass("text-right");
  }
  expect(headers.at(-1)).toHaveClass("text-right");
  expect(
    within(table).getByText("my-goodreads-library.csv"),
  ).toBeInTheDocument();
  expect(within(table).getByText("older-library.csv")).toBeInTheDocument();
  const rows = within(table).getAllByRole("row");
  expect(rows).toHaveLength(3);
  const firstRowCells = within(rows[1])
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
  expect(firstRowCells[0]).toMatch(/Oct 14, 2026/);
  expect(firstRowCells.slice(1)).toEqual(["3", "2", "4", "2", "View details"]);
  const secondRowCells = within(rows[2])
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
  expect(secondRowCells[0]).toMatch(/Jan 3, 2025/);
  expect(secondRowCells.slice(1)).toEqual(["2", "1", "2", "2", "View details"]);
  const links = within(table).getAllByRole("link", { name: "View details" });
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/app/import?importId=run-uuid-1",
    "/app/import?importId=run-uuid-2",
  ]);
});

it("shows a helpful empty state without querying nonexistent book rows", async () => {
  mockRuns.mockResolvedValue({ data: [], error: null });

  render(await ImportsPage());

  expect(screen.getByText("No imports yet")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Import a Goodreads file" }),
  ).toHaveAttribute("href", "/app/import");
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(mockFrom).toHaveBeenCalledTimes(2);
});

it("paginates every recommendation generation in stable newest-first order", async () => {
  const generations = Array.from({ length: 1001 }, (_, index) => ({
    id: `recommendation-${index}`,
    created_at: new Date(
      Date.UTC(2026, 9, 14, 10, 24) - index * 1000,
    ).toISOString(),
    import_runs: { original_filename: "history.csv" },
  }));
  mockRecommendations.mockImplementation(async (from: number) => ({
    data: generations.slice(from, from + 1000),
    error: null,
  }));

  render(await ImportsPage());

  expect(mockRecommendationOrder).toHaveBeenCalledWith("created_at", {
    ascending: false,
  });
  expect(mockRecommendationOrder).toHaveBeenCalledWith("id", {
    ascending: true,
  });
  expect(mockRecommendations.mock.calls).toEqual([
    [0, 999],
    [1000, 1999],
  ]);
  expect(
    within(
      screen.getByRole("region", { name: "Recommendation history" }),
    ).getAllByRole("link", { name: "View details" }),
  ).toHaveLength(1001);
  expect(screen.getAllByText("history.csv")).toHaveLength(1001);
  expect(
    within(
      screen.getByRole("region", { name: "Recommendation history" }),
    ).getAllByRole("link", { name: "View details" })[0],
  ).toHaveAttribute(
    "href",
    "/app/recommendations?recommendationId=recommendation-0",
  );
}, 15000);

it.each([
  { original_filename: "source-library.csv" },
  [{ original_filename: "source-library.csv" }],
  { original_filename: null },
  null,
  [],
])(
  "reads the source import filename from relation %j",
  async (sourceImport) => {
    mockRecommendations.mockResolvedValue({
      data: [
        {
          id: "saved-set",
          created_at: "2026-10-14T10:24:00.000Z",
          import_runs: sourceImport,
        },
      ],
      error: null,
    });
    render(await ImportsPage());
    const source = Array.isArray(sourceImport) ? sourceImport[0] : sourceImport;
    expect(
      screen.getByRole("rowheader", {
        name: source?.original_filename ?? "Filename unavailable",
      }),
    ).toBeInTheDocument();
  },
);

it("keeps import history visible when recommendation history fails", async () => {
  mockRecommendations.mockResolvedValue({
    data: null,
    error: new Error("query failed"),
  });
  render(await ImportsPage());
  expect(
    screen.getByRole("region", { name: "Import summary" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "couldn’t load your recommendation history",
  );
  expect(
    screen.queryByText("No recommendation history yet"),
  ).not.toBeInTheDocument();
});

it("keeps recommendation history visible when import history fails", async () => {
  mockRuns.mockResolvedValue({ data: null, error: new Error("query failed") });
  mockRecommendations.mockResolvedValue({
    data: [{ id: "saved-set", created_at: "2026-10-14T10:24:00.000Z" }],
    error: null,
  });
  render(await ImportsPage());
  expect(
    screen.getByRole("heading", { name: "Import history unavailable" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View details" })).toHaveAttribute(
    "href",
    "/app/recommendations?recommendationId=saved-set",
  );
});

it.each(["import_runs", "imported_books"])(
  "shows an actionable error rather than empty history when %s fails",
  async (failedTable) => {
    if (failedTable === "import_runs") {
      mockRuns.mockResolvedValue({
        data: null,
        error: new Error("query failed"),
      });
    } else {
      mockIn.mockResolvedValue({
        data: null,
        error: new Error("query failed"),
      });
    }

    render(await ImportsPage());

    expect(
      screen.getByRole("heading", { name: "Import history unavailable" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
      "We couldn’t load your import history",
    );
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute(
      "href",
      "/app/history",
    );
    expect(screen.queryByText("No imports yet")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Import summary" }),
    ).not.toBeInTheDocument();
  },
);

it("paginates books in stable id order without dropping or repeating rows in statistics", async () => {
  const run = [{ ...imports[0] }];
  const paginatedBooks = Array.from({ length: 1001 }, (_, index) => ({
    id: `book-${String(index).padStart(4, "0")}`,
    import_run_id: run[0].id,
    author: `Author ${index}`,
    my_rating: "4",
  }));
  mockRuns.mockResolvedValue({ data: run, error: null });
  mockIn.mockImplementation(async (from: number) => ({
    data: paginatedBooks.slice(from, from + 1000),
    error: null,
  }));

  render(await ImportsPage());

  expect(mockIn).toHaveBeenNthCalledWith(1, 0, 999);
  expect(mockIn).toHaveBeenNthCalledWith(2, 1000, 1999);
  const summary = screen.getByRole("region", { name: "Import summary" });
  expect(within(summary).getAllByText("1,001", { selector: "p" })).toHaveLength(
    3,
  );
  expect(within(summary).getByText("4")).toBeInTheDocument();
  expect(
    within(screen.getAllByRole("table")[0]).getAllByText("1001"),
  ).toHaveLength(3);
});

it("batches imported-book queries when there are more than 100 import runs", async () => {
  const manyRuns = Array.from({ length: 201 }, (_, index) => ({
    id: `run-${String(index).padStart(3, "0")}`,
    original_filename: `library-${index}.csv`,
    created_at: "2026-10-14T10:24:00.000Z",
  }));
  mockRuns.mockResolvedValue({ data: manyRuns, error: null });
  mockIn.mockResolvedValue({ data: [], error: null });

  render(await ImportsPage());

  expect(mockFilter).toHaveBeenCalledTimes(3);
  const batches = mockFilter.mock.calls.map(([, runIds]) => runIds);
  expect(batches.map((batch) => batch.length)).toEqual([100, 100, 1]);
  expect(batches.flat()).toEqual(manyRuns.map((run) => run.id));
  expect(mockIn).toHaveBeenCalledTimes(3);
  expect(mockIn.mock.calls).toEqual([
    [0, 999],
    [0, 999],
    [0, 999],
  ]);
});

it("paginates books independently for multiple run batches and aggregates every page", async () => {
  const manyRuns = Array.from({ length: 101 }, (_, index) => ({
    id: `run-${String(index).padStart(3, "0")}`,
    original_filename: `library-${index}.csv`,
    created_at: "2026-10-14T10:24:00.000Z",
  }));
  const firstBatchBooks = Array.from({ length: 1001 }, (_, index) => ({
    id: `first-book-${String(index).padStart(4, "0")}`,
    import_run_id: manyRuns[0].id,
    author: "Shared Author",
    my_rating: "4",
  }));
  const secondBatchBooks = Array.from({ length: 1002 }, (_, index) => ({
    id: `last-book-${String(index).padStart(4, "0")}`,
    import_run_id: manyRuns[100].id,
    author: index % 2 === 0 ? "Shared Author" : "Second Author",
    my_rating: index === 1001 ? "" : "4",
  }));
  let activeRunIds: string[] = [];
  mockRuns.mockResolvedValue({ data: manyRuns, error: null });
  mockFilter.mockImplementation((_column: string, runIds: string[]) => {
    activeRunIds = runIds;
    return { order: mockBookOrder };
  });
  mockIn.mockImplementation(async (from: number) => {
    const batchBooks =
      activeRunIds[0] === manyRuns[0].id ? firstBatchBooks : secondBatchBooks;
    return { data: batchBooks.slice(from, from + 1000), error: null };
  });

  render(await ImportsPage());

  expect(mockFilter.mock.calls.map(([, runIds]) => runIds.length)).toEqual([
    100, 100, 1, 1,
  ]);
  expect(mockFilter.mock.calls[0][1]).toEqual(mockFilter.mock.calls[1][1]);
  expect(mockFilter.mock.calls[2][1]).toEqual(mockFilter.mock.calls[3][1]);
  expect(mockIn.mock.calls).toEqual([
    [0, 999],
    [1000, 1999],
    [0, 999],
    [1000, 1999],
  ]);

  const summary = screen.getByRole("region", { name: "Import summary" });
  expect(
    within(summary).getByText("2,003", { selector: "p" }),
  ).toBeInTheDocument();
  expect(
    within(summary).getByText("2,002", { selector: "p" }),
  ).toBeInTheDocument();
  expect(within(summary).getByText("4")).toBeInTheDocument();
  expect(within(summary).getByText("2", { selector: "p" })).toBeInTheDocument();

  const rows = within(screen.getAllByRole("table")[0]).getAllByRole("row");
  const firstBatchRow = within(rows[1])
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
  expect(firstBatchRow.slice(1)).toEqual([
    "1001",
    "1001",
    "4",
    "1",
    "View details",
  ]);
  const secondBatchRow = within(rows[101])
    .getAllByRole("cell")
    .map((cell) => cell.textContent);
  expect(secondBatchRow.slice(1)).toEqual([
    "1002",
    "1001",
    "4",
    "2",
    "View details",
  ]);
});

it("shows an em dash when an import contains no valid ratings", () => {
  render(
    <ImportHistory
      imports={[
        {
          id: "unrated-run",
          original_filename: "unrated.csv",
          created_at: "2026-10-14T10:24:00.000Z",
          books: [{ author: "Unknown", my_rating: "" }],
        },
      ]}
    />,
  );

  const summary = screen.getByRole("region", { name: "Import summary" });
  expect(within(summary).getByText("—")).toBeInTheDocument();
  expect(within(summary).getByText("No valid ratings yet")).toBeInTheDocument();
});
