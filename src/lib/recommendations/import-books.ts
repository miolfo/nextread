import type { SupabaseClient } from "@supabase/supabase-js";
import type { Book } from "@/lib/recommendations-engine";

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

export async function loadImportBooks(
  supabase: SupabaseClient,
  importId: string,
  deadline: number,
): Promise<
  | { status: "unavailable" }
  | { status: "missing" }
  | { status: "ok"; books: Book[] }
> {
  const ownershipController = new AbortController();
  let ownedResult;
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
    return { status: "unavailable" };
  }
  if (ownedResult.error || !ownedResult.data) return { status: "missing" };

  const books: Book[] = [];
  for (let from = 0; ; from += 500) {
    if (Date.now() >= deadline) return { status: "unavailable" };
    const controller = new AbortController();
    let page;
    try {
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
      return { status: "unavailable" };
    }
    if (page.error || !page.data) return { status: "unavailable" };
    books.push(...(page.data as Book[]));
    if (page.data.length < 500) break;
  }
  return { status: "ok", books };
}
