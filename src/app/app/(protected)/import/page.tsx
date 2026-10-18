import { ImportPanel } from "@/components/import-panel";
import { ImportReview } from "@/components/import-review";
import { PageIntroduction, PageLayout } from "@/components/page-layout";
import { createClient } from "@/lib/supabase/server";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ importId?: string }>;
}) {
  const { importId } = await searchParams;
  let books: {
    id: string;
    title: string | null;
    author: string | null;
    my_rating: string | null;
    date_read: string | null;
  }[] = [];
  let unavailable = false;

  if (importId) {
    const supabase = await createClient();
    const run = await supabase
      .from("import_runs")
      .select("id")
      .eq("id", importId)
      .maybeSingle();

    if (run.error || !run.data) {
      unavailable = true;
    } else {
      const pageSize = 1000;
      for (let offset = 0; ; offset += pageSize) {
        const result = await supabase
          .from("imported_books")
          .select("id, title, author, my_rating, date_read")
          .eq("import_run_id", importId)
          .order("id", { ascending: true })
          .range(offset, offset + pageSize - 1);
        if (result.error) {
          unavailable = true;
          books = [];
          break;
        }
        books.push(...(result.data ?? []));
        if (!result.data || result.data.length < pageSize) break;
      }
    }
  }

  return (
    <PageLayout>
      {importId ? (
        <ImportReview books={books} unavailable={unavailable} />
      ) : (
        <>
          <PageIntroduction title="Import your Goodreads data">
            Use your Goodreads reading history and ratings to find personalized
            book recommendations.
          </PageIntroduction>
          <ImportPanel />
        </>
      )}
    </PageLayout>
  );
}
