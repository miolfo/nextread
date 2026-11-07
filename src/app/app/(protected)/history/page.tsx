import {
  ImportHistory,
  type ImportedBook,
  type ImportRun,
} from "@/components/import-history";
import { PageLayout } from "@/components/page-layout";
import { createClient } from "@/lib/supabase/server";
import {
  RecommendationHistory,
  type RecommendationRun,
} from "@/components/recommendation-history";

export default async function ImportsPage() {
  const supabase = await createClient();
  const pageSize = 1000;
  const runBatchSize = 100;
  const recommendations: RecommendationRun[] = [];
  let recommendationError = false;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("recommendations")
      .select("id, created_at, import_runs(original_filename)")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) {
      recommendationError = true;
      break;
    }
    recommendations.push(
      ...(data ?? []).map((recommendation) => ({
        id: recommendation.id,
        created_at: recommendation.created_at,
        original_filename:
          (
            recommendation.import_runs as
              { original_filename: string | null }[] | null
          )?.[0]?.original_filename ?? null,
      })),
    );
    if (!data || data.length < pageSize) break;
  }
  const runs: Omit<ImportRun, "books">[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("import_runs")
      .select("id, original_filename, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return (
        <PageLayout>
          <ImportHistory error />
          <RecommendationHistory
            recommendations={recommendations}
            error={recommendationError}
          />
        </PageLayout>
      );
    }
    runs.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }

  const runIds = runs.map((run) => run.id);
  const books: (ImportedBook & { import_run_id: string })[] = [];
  for (
    let batchOffset = 0;
    batchOffset < runIds.length;
    batchOffset += runBatchSize
  ) {
    const runIdBatch = runIds.slice(batchOffset, batchOffset + runBatchSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from("imported_books")
        .select("id, import_run_id, author, my_rating")
        .in("import_run_id", runIdBatch)
        .order("id", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return (
          <PageLayout>
            <ImportHistory error />
            <RecommendationHistory
              recommendations={recommendations}
              error={recommendationError}
            />
          </PageLayout>
        );
      }
      books.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
  }

  const imports = runs.map((run) => ({
    ...run,
    books: books
      .filter((book) => book.import_run_id === run.id)
      .map(({ author, my_rating }) => ({ author, my_rating })),
  }));

  return (
    <PageLayout>
      <ImportHistory imports={imports} />
      <RecommendationHistory
        recommendations={recommendations}
        error={recommendationError}
      />
    </PageLayout>
  );
}
