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
        Customize recommendations based on your reading history and the genres
        you choose.
      </PageIntroduction>
      <RecommendationControls
        imports={(data ?? []) as RecommendationImport[]}
        importError={Boolean(error)}
      />
    </PageLayout>
  );
}
