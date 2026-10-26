import type { SupabaseClient } from "@supabase/supabase-js";

export type SubjectCandidate = { subject: string; count: string };
const BATCH_SIZE = 1000;

export async function loadSubjectCandidates(
  supabase: SupabaseClient,
): Promise<SubjectCandidate[]> {
  const candidates: SubjectCandidate[] = [];
  for (let from = 0; ; from += BATCH_SIZE) {
    const { data, error } = await supabase
      .from("subject_candidate")
      .select("subject, count_text:count::text")
      .order("count", { ascending: false })
      .order("subject", { ascending: true })
      .range(from, from + BATCH_SIZE - 1);
    if (error)
      throw new Error("Unable to load subject candidates", { cause: error });
    candidates.push(
      ...(data ?? []).map(({ subject, count_text }) => ({
        subject,
        count: count_text,
      })),
    );
    if (!data || data.length < BATCH_SIZE) return candidates;
  }
}
