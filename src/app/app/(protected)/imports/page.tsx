import { ImportHistory } from "@/components/import-history";
import { PageLayout } from "@/components/page-layout";

export default async function ImportsPage() {
  return (
    <PageLayout>
      <ImportHistory />
    </PageLayout>
  );
}
