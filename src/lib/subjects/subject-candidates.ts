import type { BookSubjects } from "@/lib/open-library/books-api";
import type { SupabaseClient } from "@supabase/supabase-js";

export function aggregateSubjectCandidates(books: BookSubjects[]) {
  const counts = new Map<string, number>();
  for (const book of books) {
    for (const name of new Set(book.subjects)) {
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function persistSubjectCandidates(
  books: BookSubjects[],
  supabase: SupabaseClient,
  deadline: number,
): Promise<void> {
  const candidates = aggregateSubjectCandidates(books);
  if (!candidates.length) return;

  const controller = new AbortController();
  const operation = supabase
    .rpc("record_subject_candidates", {
      p_candidates: candidates.map(({ name, count }) => ({
        subject: name,
        count,
      })),
    })
    .abortSignal(controller.signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { error } = await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          controller.abort();
          const timeout = new Error("subject candidate persistence deadline");
          Object.assign(timeout, { code: "SUBJECT_PERSISTENCE_TIMEOUT" });
          reject(timeout);
          return;
        }
        timer = setTimeout(() => {
          controller.abort();
          const timeout = new Error("subject candidate persistence deadline");
          Object.assign(timeout, { code: "SUBJECT_PERSISTENCE_TIMEOUT" });
          reject(timeout);
        }, remaining);
      }),
    ]);
    if (error) {
      const failure = new Error("subject candidate persistence failed");
      Object.assign(failure, { code: error.code, cause: error });
      throw failure;
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}
