import { PageLayout } from "@/components/page-layout";
import { RecommendationResults } from "@/components/recommendation-results";
import { loadRecommendationResults } from "@/lib/recommendations/results";
import { createClient } from "@/lib/supabase/server";

export default async function RecommendationResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ recommendationId?: string | string[] }>;
}) {
  const { recommendationId } = await searchParams;
  const supabase = await createClient();
  const result = await loadRecommendationResults(supabase, recommendationId);
  return (
    <PageLayout>
      <RecommendationResults result={result} />
    </PageLayout>
  );
}
