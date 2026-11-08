import type { SupabaseClient } from "@supabase/supabase-js";
import type { OpenLibraryBook } from "@/lib/recommendations-engine";

export type RecommendationRunMetadata = {
  sort: "relevance" | "rating" | "random";
  fromYear?: number;
  toYear?: number;
  lengths: ("short" | "medium" | "long")[];
  includedGenres: string[];
  excludedGenres: string[];
  subjectsUsed: string[];
};

export async function persistRecommendations(
  supabase: SupabaseClient,
  importId: string,
  books: OpenLibraryBook[],
  metadata: RecommendationRunMetadata,
  deadline: number,
): Promise<string> {
  const controller = new AbortController();
  const persistedBooks = books.map(
    ({ key, title, author_name, first_publish_year, isbn, cover_i }) => ({
      key,
      title,
      author_name,
      first_publish_year,
      isbn,
      cover_i,
    }),
  );
  const operation = supabase
    .rpc("save_recommendations_with_metadata", {
      p_import_run_id: importId,
      p_books: persistedBooks,
      p_metadata: {
        sort: metadata.sort,
        from_year: metadata.fromYear ?? null,
        to_year: metadata.toYear ?? null,
        lengths: metadata.lengths,
        included_genres: metadata.includedGenres,
        excluded_genres: metadata.excludedGenres,
        subjects_used: metadata.subjectsUsed,
      },
    })
    .abortSignal(controller.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { data, error } = await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          controller.abort();
          reject(
            Object.assign(new Error("deadline"), {
              code: "RECOMMENDATION_PERSISTENCE_TIMEOUT",
            }),
          );
          return;
        }
        timer = setTimeout(() => {
          controller.abort();
          reject(
            Object.assign(new Error("deadline"), {
              code: "RECOMMENDATION_PERSISTENCE_TIMEOUT",
            }),
          );
        }, remaining);
      }),
    ]);
    if (error || typeof data !== "string")
      throw Object.assign(new Error("recommendation persistence failed"), {
        code: error?.code,
      });
    return data;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
