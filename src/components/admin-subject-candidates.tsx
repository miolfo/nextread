import type { SubjectCandidate } from "@/lib/subjects/admin-subject-candidates";
import type {
  CandidateSort,
  SortDirection,
} from "@/lib/subjects/admin-subject-candidates";
import Link from "next/link";
import { PageLayout } from "@/components/page-layout";

export function AdminSubjectsView({
  candidates,
  total,
  page,
  sort,
  direction,
  error,
}: {
  candidates: SubjectCandidate[];
  total?: number;
  page?: number;
  sort?: CandidateSort;
  direction?: SortDirection;
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
      <AdminSubjectCandidates
        candidates={candidates}
        total={total}
        page={page}
        sort={sort}
        direction={direction}
        error={error}
      />
    </PageLayout>
  );
}

export function AdminSubjectCandidates({
  candidates,
  total = candidates.length,
  page = 1,
  sort = "occurrences",
  direction = "desc",
  error = false,
}: {
  candidates: SubjectCandidate[];
  total?: number;
  page?: number;
  sort?: CandidateSort;
  direction?: SortDirection;
  error?: boolean;
}) {
  const pageSize = 20;
  const pages = Math.ceil(total / pageSize);
  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      sort,
      direction,
    });
    return `/app/admin/subjects?${params}`;
  };
  const sortHref = (key: CandidateSort) => {
    const nextDirection =
      key === sort
        ? direction === "asc"
          ? "desc"
          : "asc"
        : key === "candidate"
          ? "asc"
          : "desc";
    return `/app/admin/subjects?${new URLSearchParams({ page: "1", sort: key, direction: nextDirection })}`;
  };
  const pageNumbers = Array.from(
    new Set(
      [1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages),
    ),
  ).sort((a, b) => a - b);
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
                <th
                  scope="col"
                  aria-sort={
                    sort === "candidate"
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-4 py-3 font-medium"
                >
                  <Link
                    className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={sortHref("candidate")}
                  >
                    Candidate
                    {sort === "candidate"
                      ? direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Link>
                </th>
                <th
                  scope="col"
                  aria-sort={
                    sort === "occurrences"
                      ? direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="px-4 py-3 font-medium"
                >
                  <Link
                    className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                    href={sortHref("occurrences")}
                  >
                    Occurrences
                    {sort === "occurrences"
                      ? direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </Link>
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
      {!error && total > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * pageSize + 1).toLocaleString()}–
            {Math.min(page * pageSize, total).toLocaleString()} of{" "}
            {total.toLocaleString()} candidates
          </p>
          <nav
            aria-label="Subject candidate pages"
            className="flex flex-wrap items-center gap-2 text-sm"
          >
            {page > 1 ? (
              <Link
                className="rounded border px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring"
                href={pageHref(page - 1)}
              >
                Previous
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="rounded border px-3 py-2 text-muted-foreground"
              >
                Previous
              </span>
            )}
            {pageNumbers.map((number, index) => (
              <span className="inline-flex items-center gap-2" key={number}>
                {index > 0 && pageNumbers[index - 1] !== number - 1 && (
                  <span aria-hidden="true">…</span>
                )}
                <Link
                  aria-current={number === page ? "page" : undefined}
                  className="rounded border px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring aria-[current=page]:bg-muted"
                  href={pageHref(number)}
                >
                  {number}
                </Link>
              </span>
            ))}
            {page < pages ? (
              <Link
                className="rounded border px-3 py-2 focus-visible:outline-2 focus-visible:outline-ring"
                href={pageHref(page + 1)}
              >
                Next
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="rounded border px-3 py-2 text-muted-foreground"
              >
                Next
              </span>
            )}
          </nav>
        </>
      )}
    </section>
  );
}
