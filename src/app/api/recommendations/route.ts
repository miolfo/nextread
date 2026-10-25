import { candidateBooks, type Book } from "@/lib/recommendations-engine";
import { loadImportBooks } from "@/lib/recommendations/import-books";
import { lookupBookSubjects } from "@/lib/open-library/books-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {

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
  const deadline = Date.now() + 10_000;
  const loaded = await loadImportBooks(supabase, importId, deadline);
  if (loaded.status === "unavailable")
    return Response.json({ error: "Unavailable" }, { status: 503 });
  if (loaded.status === "missing")
    return Response.json({ error: "Import unavailable" }, { status: 404 });
  const books: Book[] = loaded.books;
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
  await lookupBookSubjects(selected, deadline);
  return Response.json({ ok: true });
}
