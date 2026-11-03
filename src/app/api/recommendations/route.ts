import {
  candidateBooks,
  excludeImportedAndDeduplicate,
  selectSubjects,
  type Book,
  type RecommendationSort,
} from "@/lib/recommendations-engine";
import { loadImportBooks } from "@/lib/recommendations/import-books";
import { lookupBookSubjects } from "@/lib/open-library/books-api";
import { searchBySubjects, SearchFailure } from "@/lib/open-library/search-api";
import { persistSubjectCandidates } from "@/lib/subjects/subject-candidates";
import { persistRecommendations } from "@/lib/recommendations/persist";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const requestStartedAt = Date.now();
  const deadline = requestStartedAt + 40_000;
  const logFailure = (phase: string, error?: unknown) => {
    if (phase === "open-library-search" && error instanceof SearchFailure) {
      console.error("Recommendation experiment unavailable", {
        phase,
        reason: error.reason,
        ...(error.upstreamStatus !== undefined
          ? { upstreamStatus: error.upstreamStatus }
          : {}),
        elapsedMs: error.elapsedMs,
        remainingSearchStartBudgetMs: error.remainingBudgetMs,
      });
      return;
    }
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32)
        : undefined;
    console.error("Recommendation experiment unavailable", {
      phase,
      ...(code ? { code } : {}),
    });
  };
  let importId: unknown;
  let sort: unknown;
  try {
    ({ importId, sort } = await request.json());
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    (sort !== undefined &&
      sort !== "relevance" &&
      sort !== "rating" &&
      sort !== "random") ||
    typeof importId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(importId)
  )
    return Response.json({ error: "Invalid request" }, { status: 400 });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const loaded = await loadImportBooks(supabase, importId, deadline);
  if (loaded.status === "unavailable") {
    logFailure("import-books");
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  if (loaded.status === "missing")
    return Response.json({ error: "Import unavailable" }, { status: 404 });
  const books: Book[] = loaded.books;
  const save = async (
    recommendations: import("@/lib/recommendations-engine").OpenLibraryBook[],
  ) => {
    try {
      const recommendationId = await persistRecommendations(
        supabase,
        importId,
        recommendations,
        deadline,
      );
      return Response.json({ ok: true, recommendationId, recommendations });
    } catch (error) {
      logFailure("recommendation-persistence", error);
      return Response.json({ error: "Unavailable" }, { status: 503 });
    }
  };
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
    return save([]);
  }
  let booksWithSubjects;
  try {
    booksWithSubjects = await lookupBookSubjects(selected, deadline);
  } catch (error) {
    logFailure("open-library", error);
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  try {
    await persistSubjectCandidates(booksWithSubjects, supabase, deadline);
    console.log(
      "Recommendation subject persistence",
      JSON.stringify({ status: "complete" }),
    );
  } catch (error) {
    logFailure("subject-candidates", error);
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  const subjects = selectSubjects(booksWithSubjects);
  if (!subjects.length) return save([]);
  let found;
  try {
    found = await searchBySubjects(
      subjects,
      deadline,
      (sort ?? "relevance") as RecommendationSort,
    );
  } catch (error) {
    logFailure("open-library-search", error);
    return Response.json({ error: "Unavailable" }, { status: 503 });
  }
  const recommendations = excludeImportedAndDeduplicate(found, books);
  if (process.env.NODE_ENV === "development") {
    try {
      console.log(
        "Recommendation search candidates",
        JSON.stringify(recommendations, null, 2),
      );
    } catch {
      // Diagnostics must not affect recommendation delivery.
    }
  }
  return save(recommendations);
}
