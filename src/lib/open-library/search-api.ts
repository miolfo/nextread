import {
  buildSubjectSearchUrl,
  validateSearchBooks,
  type OpenLibraryBook,
  type RecommendationSort,
  type RecommendationFilters,
} from "@/lib/recommendations-engine";
import { waitForOpenLibrarySlot } from "@/lib/open-library/rate-limit";

export type SearchFailureReason =
  | "deadline-exhausted"
  | "timeout"
  | "http-error"
  | "network-error"
  | "missing-body"
  | "response-too-large"
  | "invalid-json"
  | "invalid-shape"
  | "query-too-large";

export class SearchFailure extends Error {
  constructor(
    readonly reason: SearchFailureReason,
    readonly elapsedMs: number,
    readonly remainingBudgetMs: number,
    readonly upstreamStatus?: number,
  ) {
    super(reason);
  }
}

export async function searchBySubjects(
  subjects: string[],
  deadline: number,
  sort: RecommendationSort = "relevance",
  offset = 0,
  filters: RecommendationFilters = {},
): Promise<OpenLibraryBook[]> {
  if (!subjects.length) return [];
  const startedAt = Date.now();
  const remaining = Math.min(deadline, startedAt + 30_000) - startedAt;
  const searchDeadline = startedAt + remaining;
  const failure = (reason: SearchFailureReason, status?: number) =>
    new SearchFailure(
      reason,
      Math.max(0, Date.now() - startedAt),
      Math.max(0, remaining),
      status,
    );
  if (remaining <= 0) throw failure("deadline-exhausted");
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, remaining);
  const raceDeadline = <T>(promise: Promise<T>) => {
    let deadlineTimer: ReturnType<typeof setTimeout>;
    const wait = Math.max(0, searchDeadline - Date.now());
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        deadlineTimer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(failure("timeout"));
        }, wait);
      }),
    ]).finally(() => clearTimeout(deadlineTimer));
  };
  try {
    let url: URL;
    try {
      url = buildSubjectSearchUrl(subjects, sort, filters);
      url.searchParams.set("offset", String(offset));
    } catch {
      throw failure("query-too-large");
    }
    if (process.env.NODE_ENV === "development") {
      try {
        console.log(
          "Open Library recommendation search",
          JSON.stringify(
            {
              filters: {
                ...(filters.fromYear !== undefined
                  ? { fromYear: filters.fromYear }
                  : {}),
                ...(filters.toYear !== undefined
                  ? { toYear: filters.toYear }
                  : {}),
                lengths: filters.lengths ?? [],
                includedGenres: filters.includedGenres ?? [],
                excludedGenres: filters.excludedGenres ?? [],
              },
              subjects,
              sort,
              pagination: { limit: 50, offset },
              url: url.href,
            },
            null,
            2,
          ),
        );
      } catch {
        // Diagnostics must not affect the search request.
      }
    }
    let response: Response;
    try {
      if (process.env.VITEST !== "true")
        await raceDeadline(waitForOpenLibrarySlot(searchDeadline));
      response = await raceDeadline(
        fetch(url, {
          signal: controller.signal,
          redirect: "error",
          cache: "no-store",
        }),
      );
    } catch (error) {
      if (error instanceof SearchFailure) throw error;
      if (timedOut) throw failure("timeout");
      throw failure("network-error");
    }
    if (!response.ok) throw failure("http-error", response.status);
    if (!response.body) throw failure("missing-body");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      let next: ReadableStreamReadResult<Uint8Array>;
      try {
        next = await raceDeadline(reader.read());
      } catch (error) {
        void reader.cancel().catch(() => {});
        if (error instanceof SearchFailure) throw error;
        throw failure(timedOut ? "timeout" : "network-error");
      }
      const { done, value } = next;
      if (done) break;
      size += value.byteLength;
      if (size > 2 * 1024 * 1024 || Date.now() >= searchDeadline) {
        void reader.cancel().catch(() => {});
        throw failure(
          size > 2 * 1024 * 1024 ? "response-too-large" : "timeout",
        );
      }
      chunks.push(value);
    }
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder().decode(Buffer.concat(chunks)));
    } catch {
      throw failure("invalid-json");
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload) ||
      !Array.isArray((payload as { docs?: unknown }).docs)
    )
      throw failure("invalid-shape");
    const books = validateSearchBooks(payload);
    return books;
  } finally {
    clearTimeout(timer);
  }
}
