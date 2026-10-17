import { ImportPanel } from "@/components/import-panel";
import { ImportReview } from "@/components/import-review";
import { PageIntroduction, PageLayout } from "@/components/page-layout";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ importId?: string }>;
}) {
  const { importId } = await searchParams;

  return (
    <PageLayout>
      {importId ? (
        <ImportReview />
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
