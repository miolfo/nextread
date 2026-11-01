import type { Candidate } from "@/lib/recommendations-engine";

export type BookSubjects = { title: string; subjects: string[] };

function cancelReader(reader: ReadableStreamDefaultReader<Uint8Array>) {
  try {
    void reader.cancel().catch(() => {});
  } catch {
    // Stream cancellation is best effort and must not delay request completion.
  }
}

function beforeDeadline<T>(
  operation: PromiseLike<T>,
  deadline: number,
  cancel?: () => void,
): Promise<T> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new Error("deadline"));
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    Promise.resolve(operation),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        cancel?.();
        reject(new Error("deadline"));
      }, remaining);
    }),
  ]).finally(() => clearTimeout(timer));
}

export async function lookupBookSubjects(
  selected: Candidate[],
  deadline: number,
): Promise<BookSubjects[]> {
  const url = new URL("https://openlibrary.org/api/books");
  url.searchParams.set(
    "bibkeys",
    selected.map(({ isbn }) => `ISBN:${isbn}`).join(","),
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("jscmd", "data");
  const controller = new AbortController();
  let responseStatus: number | undefined;
  let diagnostic = "network-error";
  let responseKeyCount: number | undefined;
  let entryIndex: number | undefined;
  const logBatch = (status: string, extra: Record<string, unknown> = {}) => {
    try {
      console.log("Recommendation experiment", {
        status,
        responseStatus: responseStatus ?? null,
        diagnostic,
        ...extra,
      });
    } catch {
      /* diagnostics never affect response */
    }
  };
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(1, deadline - Date.now()),
  );
  try {
    const response = await beforeDeadline(
      fetch(url, {
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      }),
      deadline,
      () => controller.abort(),
    );
    responseStatus = response.status;
    if (!response.ok) {
      diagnostic = "http-error";
      try {
        const reader = response.body?.getReader();
        if (reader) {
          await beforeDeadline(reader.read(), deadline, () => {
            controller.abort();
            cancelReader(reader);
          });
          cancelReader(reader);
        }
      } catch {
        /* status remains useful if error body stalls */
      }
      logBatch("batch-failure");
      return [];
    }
    diagnostic = "missing-body";
    const reader = response.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await beforeDeadline(
        reader.read(),
        deadline,
        () => {
          controller.abort();
          cancelReader(reader);
        },
      );
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024 || Date.now() >= deadline) {
        diagnostic = size > 2 * 1024 * 1024 ? "response-too-large" : "timeout";
        cancelReader(reader);
        throw new Error();
      }
      chunks.push(value);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    } catch {
      diagnostic = "invalid-json";
      throw new Error();
    }
    diagnostic = "invalid-top-level-shape";
    if (!payload || typeof payload !== "object" || Array.isArray(payload))
      throw new Error();
    const record = payload as Record<string, unknown>;
    responseKeyCount = Object.keys(record).length;
    diagnostic = "processing-entries";
    const logs = selected.map((book) => {
      entryIndex = selected.indexOf(book);
      diagnostic = "reading-entry";
      const entry = record[`ISBN:${book.isbn}`];
      if (!entry || typeof entry !== "object" || Array.isArray(entry))
        return { title: book.title, subjects: [] };
      const raw = (entry as { subjects?: unknown }).subjects;
      if (!Array.isArray(raw)) return { title: book.title, subjects: [] };
      diagnostic = "normalizing-subjects";
      const subjects = [
        ...new Set(
          raw.flatMap((subject) => {
            if (!subject || typeof subject !== "object" || !("name" in subject))
              return [];
            const name = subject.name;
            return typeof name === "string" && name.trim().length > 0
              ? [name]
              : [];
          }),
        ),
      ];
      return { title: book.title, subjects };
    });
    console.log(
      "Recommendation experiment",
      JSON.stringify(
        {
          status: "complete",
          responseStatus,
          diagnostic: "parsed",
          responseKeyCount,
          bookCount: logs.length,
        },
        null,
        2,
      ),
    );
    return logs;
  } catch {
    if (diagnostic === "network-error" && controller.signal.aborted)
      diagnostic = "timeout";
    logBatch("batch-failure", { responseKeyCount, entryIndex });
    return [];
  } finally {
    clearTimeout(timer);
  }
}
