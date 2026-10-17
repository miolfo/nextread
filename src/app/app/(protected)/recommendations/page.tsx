import { PageIntroduction, PageLayout } from "@/components/page-layout";
import { RecommendationControls } from "@/components/recommendation-controls";

export default async function RecommendationsPage() {
  return (
    <PageLayout>
      <PageIntroduction title="Get book recommendations">
        Ask AI for personalized suggestions, or generate a randomized list based
        on your preferences.
      </PageIntroduction>
      <RecommendationControls />
    </PageLayout>
  );
}
