import { AdminSubjectsView } from "@/components/admin-subject-candidates";
import {
  loadSubjectCandidates,
  type SubjectCandidate,
} from "@/lib/subjects/admin-subject-candidates";
import { requireAdminUser } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSubjectsPage() {
  await requireAdminUser("/app/admin/subjects");
  const supabase = await createClient();
  let candidates: SubjectCandidate[] = [];
  let error = false;
  try {
    candidates = await loadSubjectCandidates(supabase);
  } catch {
    error = true;
  }
  return <AdminSubjectsView candidates={candidates} error={error} />;
}
