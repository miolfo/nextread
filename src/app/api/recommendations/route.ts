import { candidateBooks, type Book } from "@/lib/recommendations-engine";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production")
    return Response.json({ error: "Unavailable" }, { status: 404 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let importId: unknown;
  try {
    ({ importId } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof importId !== "string" || !/^[0-9a-f-]{36}$/i.test(importId))
    return Response.json({ error: "Invalid request" }, { status: 400 });
  let ownedResult;
  const deadline = Date.now() + 10_000;
  const ownershipController = new AbortController();
  try {
    ownedResult = await beforeDeadline(
      supabase
        .from("import_runs")
        .select("id")
        .eq("id", importId)
        .abortSignal(ownershipController.signal)
        .maybeSingle(),
      deadline,
      () => ownershipController.abort(),
    );
  } catch {
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  const { data: owned, error: ownershipError } = ownedResult;
  if (ownershipError || !owned)
    return Response.json({ error: "Import unavailable" }, { status: 404 });

  const books: Book[] = [];
  for (let from = 0; ; from += 500) {
    if (Date.now() >= deadline)
      return Response.json({ error: "Unavailable" }, { status: 503 });
    let page;
    try {
      const controller = new AbortController();
      page = await beforeDeadline(
        supabase
          .from("imported_books")
          .select("title,isbn,isbn13,my_rating")
          .eq("import_run_id", importId)
          .order("id")
          .range(from, from + 499)
          .abortSignal(controller.signal),
        deadline,
        () => controller.abort(),
      );
    } catch {
      return Response.json({ error: "Unavailable" }, { status: 503 });
    }
    const { data, error } = page;
    if (error || !data)
      return Response.json({ error: "Unavailable" }, { status: 503 });
    books.push(...(data as Book[]));
    if (data.length < 500) break;
  }
  const candidates = candidateBooks(books);
  const sample = [...candidates];
  for (let i = sample.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sample[i], sample[j]] = [sample[j], sample[i]];
  }
  const selected = sample.slice(0, 10);
  if (!selected.length) {
    console.log("Recommendation experiment", {
      status: "no-eligible-isbn",
      books: [],
    });
    return Response.json({ ok: true });
  }
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
  let responseKeys: string[] | undefined;
  let responseKeyCount: number | undefined;
  let entryIndex: number | undefined;
  const logBatch = (status: string, extra: Record<string, unknown> = {}) => {
    try {
      console.log("Recommendation experiment", {
        status,
        url: url.toString(),
        responseStatus: responseStatus ?? null,
        diagnostic,
        ...extra,
      });
    } catch {
      // Diagnostics must never affect the experiment response.
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
      const contentType = response.headers.get("content-type");
      let bodySummary: string | undefined;
      try {
        const reader = response.body?.getReader();
        if (reader) {
          const { value } = await beforeDeadline(
            reader.read(),
            deadline,
            () => {
              controller.abort();
              void reader.cancel();
            },
          );
          if (value) {
            // Keep provider error data strictly bounded; this is a diagnostic
            // excerpt only, not a copy of the response body.
            bodySummary = new TextDecoder().decode(value.slice(0, 512));
          }
          await reader.cancel();
        }
      } catch {
        // The status and content type remain useful if the error body stalls.
      }
      logBatch("batch-failure", {
        contentType,
        ...(bodySummary ? { bodyExcerpt: bodySummary } : {}),
      });
      return Response.json({ ok: true });
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
          void reader.cancel();
        },
      );
      if (done) break;
      size += value.length;
      if (size > 2 * 1024 * 1024 || Date.now() >= deadline) {
        diagnostic = size > 2 * 1024 * 1024 ? "response-too-large" : "timeout";
        await reader.cancel();
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
    responseKeys = Object.keys(record).slice(0, 10);
    responseKeyCount = Object.keys(record).length;
    diagnostic = "processing-entries";
    const logs = selected.map((book) => {
      entryIndex = selected.indexOf(book);
      diagnostic = "reading-entry";
      const entry = record[`ISBN:${book.isbn}`];
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return { title: book.title, subjects: [] };
      }
      const raw = (entry as { subjects?: unknown }).subjects;
      if (!Array.isArray(raw)) {
        return { title: book.title, subjects: [] };
      }
      diagnostic = "normalizing-subjects";
      const subjects = raw
        .flatMap((subject) => {
          if (!subject || typeof subject !== "object" || !("name" in subject))
            return [];
          const name = subject.name;
          if (typeof name !== "string") return [];
          return [name.slice(0, 100)];
        })
        .slice(0, 20);
      return { title: book.title, subjects };
    });
    console.log(
      "Recommendation experiment",
      JSON.stringify({
        status: "complete",
        url: url.toString(),
        responseStatus,
        diagnostic: "parsed",
        responseKeys,
        responseKeyCount,
        books: logs,
      }),
    );
  } catch {
    if (diagnostic === "network-error" && controller.signal.aborted)
      diagnostic = "timeout";
    logBatch("batch-failure", {
      responseKeys,
      responseKeyCount,
      entryIndex,
    });
  } finally {
    clearTimeout(timer);
  }
  return Response.json({ ok: true });
}
