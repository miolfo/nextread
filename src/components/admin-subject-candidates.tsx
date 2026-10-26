import type { SubjectCandidate } from "@/lib/subjects/admin-subject-candidates";
import { PageLayout } from "@/components/page-layout";

export function AdminSubjectsView({
  candidates,
  error,
}: {
  candidates: SubjectCandidate[];
  error: boolean;
}) {
  return (
    <PageLayout>
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Admin
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Subject candidates
        </h1>
        <p className="text-muted-foreground">
          Review subject candidates extracted from imported data.
        </p>
      </div>
      <AdminSubjectCandidates candidates={candidates} error={error} />
    </PageLayout>
  );
}

export function AdminSubjectCandidates({
  candidates,
  error = false,
}: {
  candidates: SubjectCandidate[];
  error?: boolean;
}) {
  return (
    <section className="space-y-4" aria-label="Subject candidates">
      {error ? (
        <p role="alert" className="rounded-md border p-6 text-muted-foreground">
          Subject candidates are currently unavailable. Please try again later.
        </p>
      ) : candidates.length === 0 ? (
        <p className="rounded-md border p-6 text-muted-foreground">
          No subject candidates yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Candidate
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Occurrences
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Promoted
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(({ subject, count }) => (
                <tr className="border-t" key={subject}>
                  <td className="max-w-0 break-words px-4 py-3">{subject}</td>
                  <td className="px-4 py-3 tabular-nums">{count}</td>
                  <td className="px-4 py-3">
                    <input
                      aria-label={`${subject}: promoted`}
                      type="checkbox"
                      disabled
                      checked={false}
                      readOnly
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!error && (
        <p className="text-sm text-muted-foreground">
          {candidates.length.toLocaleString()} candidates
        </p>
      )}
    </section>
  );
}
