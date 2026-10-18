import {
  ImportHistory,
  type ImportedBook,
  type ImportRun,
} from "@/components/import-history";
import { PageLayout } from "@/components/page-layout";
import { createClient } from "@/lib/supabase/server";

export default async function ImportsPage() {
  const supabase = await createClient();
  const pageSize = 1000;
  const runBatchSize = 100;
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
    </PageLayout>
  );
}
