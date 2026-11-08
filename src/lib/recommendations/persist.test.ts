import { describe, expect, it, vi } from "vitest";
import { persistRecommendations } from "@/lib/recommendations/persist";

const metadata = {
  sort: "relevance" as const,
  lengths: [],
  includedGenres: [],
  excludedGenres: [],
  subjectsUsed: ["Raw Subject"],
};

describe("persistRecommendations", () => {
  it("saves ordered recommendations and returns the set ID, including empty sets", async () => {
    const abortSignal = vi.fn(() =>
      Promise.resolve({ data: "set-id", error: null }),
    );
    const rpc = vi.fn(() => ({ abortSignal }));
    const supabase = { rpc } as never;
    await expect(
      persistRecommendations(
        supabase,
        "import-id",
        [],
        metadata,
        Date.now() + 1000,
      ),
    ).resolves.toBe("set-id");
    expect(rpc).toHaveBeenCalledWith("save_recommendations_with_metadata", {
      p_import_run_id: "import-id",
      p_books: [],
      p_metadata: {
        sort: "relevance",
        from_year: null,
        to_year: null,
        lengths: [],
        included_genres: [],
        excluded_genres: [],
        subjects_used: ["Raw Subject"],
      },
    });
    expect(supabase).toBeDefined();
  });

  it("projects ordered books onto the persistence allowlist without mutation", async () => {
    const abortSignal = vi.fn(() =>
      Promise.resolve({ data: "set-id", error: null }),
    );
    const rpc = vi.fn(() => ({ abortSignal }));
    const supabase = { rpc } as never;
    const books = [
      {
        key: "/works/1",
        title: "First",
        author_name: ["Author"],
        author_key: ["/authors/A1"],
        first_publish_year: 2001,
        isbn: ["123"],
        cover_i: 42,
        extension: "not persisted",
      },
      {
        key: "/works/2",
        title: "Second",
        author_key: ["/authors/A2"],
      },
    ];
    const original = structuredClone(books);

    await expect(
      persistRecommendations(
        supabase,
        "import-id",
        books,
        metadata,
        Date.now() + 1000,
      ),
    ).resolves.toBe("set-id");

    expect(rpc).toHaveBeenCalledWith("save_recommendations_with_metadata", {
      p_import_run_id: "import-id",
      p_books: [
        {
          key: "/works/1",
          title: "First",
          author_name: ["Author"],
          first_publish_year: 2001,
          isbn: ["123"],
          cover_i: 42,
        },
        {
          key: "/works/2",
          title: "Second",
          author_name: undefined,
          first_publish_year: undefined,
          isbn: undefined,
          cover_i: undefined,
        },
      ],
      p_metadata: {
        sort: "relevance",
        from_year: null,
        to_year: null,
        lengths: [],
        included_genres: [],
        excluded_genres: [],
        subjects_used: ["Raw Subject"],
      },
    });
    expect(books).toEqual(original);
  });

  it("rejects storage errors", async () => {
    const supabase = {
      rpc: () => ({
        abortSignal: () =>
          Promise.resolve({ data: null, error: { code: "XX" } }),
      }),
    } as never;
    await expect(
      persistRecommendations(
        supabase,
        "import-id",
        [],
        metadata,
        Date.now() + 1000,
      ),
    ).rejects.toThrow();
  });
});
