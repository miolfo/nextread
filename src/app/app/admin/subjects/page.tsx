import { AdminSubjectsView } from "@/components/admin-subject-candidates";
import {
  loadSubjectCandidates,
  SUBJECT_CANDIDATE_PAGE_SIZE,
  type CandidateSort,
  type SortDirection,
  type SubjectCandidate,
} from "@/lib/subjects/admin-subject-candidates";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Query = {
  page?: string | string[];
  sort?: string | string[];
  direction?: string | string[];
};

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireAdminUser("/app/admin/subjects");
  const query = await searchParams;
  const rawPage = scalar(query.page);
  const parsedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 1;
  const page =
    Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  let normalizedPage = page;
  const sortValue = scalar(query.sort);
  const sort: CandidateSort =
    sortValue === "candidate" || sortValue === "occurrences"
      ? sortValue
      : "occurrences";
  const rawDirection = scalar(query.direction);
  const direction: SortDirection =
    rawDirection === "asc" || rawDirection === "desc"
      ? rawDirection
      : sort === "candidate"
        ? "asc"
        : "desc";
  const supabase = await createClient();
  let candidates: SubjectCandidate[] = [];
  let total = 0;
  let error = false;
  let pageCount = 0;
  try {
    const result = await loadSubjectCandidates(supabase, page, sort, direction);
    total = result.total;
    pageCount = Math.ceil(total / SUBJECT_CANDIDATE_PAGE_SIZE);
    candidates = result.candidates;
    normalizedPage = result.page;
  } catch {
    error = true;
  }
  if (!error && pageCount > 0 && page > pageCount) {
    const params = new URLSearchParams({
      page: String(pageCount),
      sort,
      direction,
    });
    redirect(`/app/admin/subjects?${params}`);
  }
  return (
    <AdminSubjectsView
      candidates={candidates}
      total={total}
      page={normalizedPage}
      sort={sort}
      direction={direction}
      error={error}
    />
  );
}
