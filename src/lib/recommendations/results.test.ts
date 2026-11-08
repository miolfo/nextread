import { describe, expect, it, vi } from "vitest";
import { loadRecommendationResults } from "@/lib/recommendations/results";

const id = "123e4567-e89b-42d3-a456-426614174000";
function fakeClient({
  recommendation = {
    id,
    applied_filters: { sort: "relevance" },
    subjects_used: ["Raw Subject"],
    import_filename: "library.csv",
  },
  recommendationError = null,
  books = [],
  booksError = null,
}: {
  recommendation?: unknown;
  recommendationError?: unknown;
  books?: unknown[];
  booksError?: unknown;
} = {}) {
  const order = vi.fn().mockResolvedValue({ data: books, error: booksError });
  const maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: recommendation, error: recommendationError });
  const client = {
    from: vi.fn((table: string) => ({
      select: vi.fn(() =>
        table === "recommendations"
          ? { eq: vi.fn(() => ({ maybeSingle })) }
          : { eq: vi.fn(() => ({ order })) },
      ),
    })),
  };
  return { client, order, maybeSingle };
}

describe("loadRecommendationResults", () => {
  it.each([undefined, [id], "not-a-uuid"])(
    "rejects invalid identifiers %s without querying",
    async (value) => {
      const { client } = fakeClient();
      expect(await loadRecommendationResults(client as never, value)).toEqual({
        state: "invalid",
      });
      expect(client.from).not.toHaveBeenCalled();
    },
  );

  it("loads actual books in saved position order and selects ordering metadata", async () => {
    const books = [
      {
        key: "/works/OL1W",
        title: "Saved",
        author_name: null,
        first_publish_year: null,
      },
    ];
    const { client, order } = fakeClient({ books });
    expect(await loadRecommendationResults(client as never, id)).toEqual({
      state: "loaded",
      books,
      metadata: {
        importFilename: "library.csv",
        filters: { sort: "relevance" },
        subjectsUsed: ["Raw Subject"],
      },
    });
    expect(client.from).toHaveBeenNthCalledWith(2, "recommended_book");
    expect(order).toHaveBeenCalledWith("position", { ascending: true });
  });

  it("returns empty and unavailable states without inventing books", async () => {
    expect(
      await loadRecommendationResults(
        fakeClient({ books: [] }).client as never,
        id,
      ),
    ).toEqual({
      state: "empty",
      books: [],
      metadata: {
        importFilename: "library.csv",
        filters: { sort: "relevance" },
        subjectsUsed: ["Raw Subject"],
      },
    });
    expect(
      await loadRecommendationResults(
        fakeClient({ recommendation: null }).client as never,
        id,
      ),
    ).toEqual({ state: "invalid" });
    expect(
      await loadRecommendationResults(
        fakeClient({ recommendationError: new Error() }).client as never,
        id,
      ),
    ).toEqual({ state: "error" });
    expect(
      await loadRecommendationResults(
        fakeClient({ booksError: new Error() }).client as never,
        id,
      ),
    ).toEqual({ state: "error" });
  });
});
