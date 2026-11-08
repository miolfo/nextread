import { PageIntroduction, PageLayout } from "@/components/page-layout";
import { RecommendationControls } from "@/components/recommendation-controls";
import { createClient } from "@/lib/supabase/server";

type RecommendationImport = {
  id: string;
  original_filename: string | null;
  created_at: string;
};

export default async function RecommendationsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("import_runs")
    .select("id, original_filename, created_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });

  return (
    <PageLayout>
      <PageIntroduction centered title="Get book recommendations">
        Find books from your reading history, ordered by relevance, rating, or
        at random. All filters are optional. Recommendations target 10 books and
        may return fewer. Include filters match any selected genre; exclude
        filters remove books matching any selected genre.
      </PageIntroduction>
      <RecommendationControls
        imports={(data ?? []) as RecommendationImport[]}
        importError={Boolean(error)}
      />
    </PageLayout>
  );
}
