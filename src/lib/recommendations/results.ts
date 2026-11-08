import type { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type SavedRecommendationBook = {
  key: string;
  title: string;
  author_name: string[] | null;
  first_publish_year: number | null;
};

export type RecommendationResultsLoad =
  | { state: "invalid" }
  | { state: "error" }
  | {
      state: "empty" | "loaded";
      books: SavedRecommendationBook[];
      metadata: AppliedRecommendationMetadata | null;
    };

export type AppliedRecommendationMetadata = {
  importFilename: string | null;
  filters: Record<string, unknown>;
  subjectsUsed: string[];
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidRecommendationId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export async function loadRecommendationResults(
  supabase: SupabaseClient,
  id: string | string[] | undefined,
): Promise<RecommendationResultsLoad> {
  if (!isValidRecommendationId(id)) return { state: "invalid" };

  const { data: recommendation, error } = await supabase
    .from("recommendations")
    .select("id,applied_filters,subjects_used,import_filename")
    .eq("id", id)
    .maybeSingle();
  if (error) return { state: "error" };
  if (!recommendation) return { state: "invalid" };

  const metadata =
    recommendation.applied_filters && recommendation.subjects_used
      ? {
          importFilename: recommendation.import_filename,
          filters: recommendation.applied_filters as Record<string, unknown>,
          subjectsUsed: recommendation.subjects_used as string[],
        }
      : null;
  const { data, error: booksError } = await supabase
    .from("recommended_book")
    .select("key, title, author_name, first_publish_year")
    .eq("recommendation_id", id)
    .order("position", { ascending: true });
  if (booksError) return { state: "error" };
  if (!data?.length) return { state: "empty", books: [], metadata };
  return { state: "loaded", books: data, metadata };
}
