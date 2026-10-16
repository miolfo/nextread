import { PageIntroduction, PageLayout } from "@/components/page-layout";

export default function HomePage() {
  return (
    <PageLayout narrow>
      <PageIntroduction title="Next Read">
        Find your next book based on your Goodreads reading history, ratings,
        and reviews.
      </PageIntroduction>
    </PageLayout>
  );
}
