import { ImportPanel } from "@/components/import-panel";
import { PageIntroduction, PageLayout } from "@/components/page-layout";

export default function ImportPage() {
  return (
    <PageLayout narrow>
      <PageIntroduction title="Import your Goodreads data">
        Use your Goodreads reading history and ratings to find personalized book
        recommendations.
      </PageIntroduction>
      <ImportPanel />
    </PageLayout>
  );
}
