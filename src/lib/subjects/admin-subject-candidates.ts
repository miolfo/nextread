import type { SupabaseClient } from "@supabase/supabase-js";

export type SubjectCandidate = { subject: string; count: string };
export type CandidateSort = "candidate" | "occurrences";
export type SortDirection = "asc" | "desc";
export const SUBJECT_CANDIDATE_PAGE_SIZE = 20;

export type SubjectCandidatePage = {
  candidates: SubjectCandidate[];
  total: number;
  page: number;
};

export async function loadSubjectCandidates(
  supabase: SupabaseClient,
  page: number,
  sort: CandidateSort,
  direction: SortDirection,
): Promise<SubjectCandidatePage> {
  const { count, error: countError } = await supabase
    .from("subject_candidate")
    .select("subject", { count: "exact", head: true });
  if (
    countError ||
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0
  )
    throw new Error("Unable to count subject candidates", {
      cause: countError,
    });

  const pageCount = Math.ceil(count / SUBJECT_CANDIDATE_PAGE_SIZE);
  if (count === 0) return { candidates: [], total: 0, page: 1 };
  if (page > pageCount) return { candidates: [], total: count, page };

  const primary = sort === "candidate" ? "subject" : "count";
  const ascending = direction === "asc";
  const from = (page - 1) * SUBJECT_CANDIDATE_PAGE_SIZE;
  let query = supabase
    .from("subject_candidate")
    .select("subject, count_text:count::text")
    .order(primary, { ascending });
  if (sort === "occurrences")
    query = query.order("subject", { ascending: true });
  const { data, error } = await query.range(
    from,
    from + SUBJECT_CANDIDATE_PAGE_SIZE - 1,
  );
  if (error || !data)
    throw new Error("Unable to load subject candidates", { cause: error });
  return {
    candidates: data.map(({ subject, count_text }) => ({
      subject,
      count: count_text,
    })),
    total: count,
    page,
  };
}
