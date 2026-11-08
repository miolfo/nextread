"use client";

import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { RecommendationResultsLoad } from "@/lib/recommendations/results";

const decorations = [
  [
    "The Glass Observatory",
    "Mara Ellison",
    "2022",
    "from-slate-950 via-indigo-950 to-orange-200",
    "✦",
  ],
  [
    "A Sea of Quiet Stars",
    "Elias Rowan",
    "2019",
    "from-cyan-950 via-teal-800 to-sky-200",
    "〰",
  ],
  [
    "The Last Cartographer",
    "Nora Vale",
    "2024",
    "from-amber-100 via-stone-300 to-yellow-900",
    "⌖",
  ],
  [
    "Under the Amber Moon",
    "Theo Mercer",
    "2021",
    "from-orange-950 via-amber-700 to-yellow-200",
    "☾",
  ],
  [
    "The Atlas of Rain",
    "Iris Cole",
    "2020",
    "from-slate-900 via-teal-700 to-cyan-100",
    "⌁",
  ],
  [
    "A Map of Borrowed Time",
    "June Arden",
    "2023",
    "from-violet-950 via-indigo-800 to-rose-200",
    "◷",
  ],
  [
    "The Orchard at World's End",
    "Caleb North",
    "2018",
    "from-emerald-950 via-green-700 to-lime-200",
    "❋",
  ],
  [
    "When the Mountains Sing",
    "Lena Hart",
    "2022",
    "from-blue-950 via-sky-700 to-amber-100",
    "⌁",
  ],
  [
    "The Archive of Small Things",
    "Mina Bell",
    "2021",
    "from-rose-950 via-pink-700 to-orange-100",
    "✧",
  ],
  [
    "A Light Beneath the City",
    "R. J. Ellis",
    "2024",
    "from-neutral-950 via-stone-700 to-yellow-200",
    "✦",
  ],
  [
    "The Wintering Sea",
    "Sofia Wren",
    "2017",
    "from-blue-950 via-indigo-700 to-slate-200",
    "❄",
  ],
  [
    "Where the Wild Hours Go",
    "Amir Sol",
    "2023",
    "from-fuchsia-950 via-purple-700 to-pink-200",
    "✺",
  ],
] as const;

export function RecommendationResults({
  result,
}: {
  result: RecommendationResultsLoad;
}) {
  const [page, setPage] = useState(0);
  const books = result.state === "loaded" ? result.books : [];
  const pageCount = Math.ceil(books.length / 4);
  const visibleBooks = books.slice(page * 4, page * 4 + 4);
  const metadata =
    result.state === "loaded" || result.state === "empty"
      ? result.metadata
      : null;
  const filterValue = (key: string, fallback: string) => {
    const value = metadata?.filters[key];
    if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : fallback;
  };

  return (
    <section aria-label="Book recommendations" className="space-y-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.16em] text-emerald-800 uppercase">
            Recommendations
          </p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
            Your book recommendations
          </h1>
          <p className="text-muted-foreground">Saved recommendations</p>
        </div>
        <Button
          variant="outline"
          className="w-fit"
          nativeButton={false}
          render={<Link href="/app/recommendations" />}
        >
          <RefreshCw aria-hidden="true" /> Generate again
        </Button>
      </div>
      {(result.state === "loaded" || result.state === "empty") && (
        <section
          aria-label="Applied filters"
          className="rounded-xl border bg-card p-5"
        >
          <h2 className="mb-4 font-serif text-xl font-semibold">
            Applied filters
          </h2>
          {metadata ? (
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="font-medium">Included genres</dt>
                <dd className="mt-1 text-muted-foreground">
                  {filterValue("included_genres", "None")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Excluded genres</dt>
                <dd className="mt-1 text-muted-foreground">
                  {filterValue("excluded_genres", "None")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Sorted by</dt>
                <dd className="mt-1 text-muted-foreground">
                  {metadata.filters.sort === "rating"
                    ? "Highest rated"
                    : metadata.filters.sort === "random"
                      ? "Random"
                      : metadata.filters.sort === "relevance"
                        ? "Relevance"
                        : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Publication year range</dt>
                <dd className="mt-1 text-muted-foreground">
                  {filterValue("from_year", "Any")}–
                  {filterValue("to_year", "Any")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Book length</dt>
                <dd className="mt-1 text-muted-foreground">
                  {filterValue("lengths", "None")}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Import</dt>
                <dd className="mt-1 break-all text-muted-foreground">
                  {metadata.importFilename || "Filename unavailable"}
                </dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <dt className="font-medium">Subjects used</dt>
                <dd className="mt-1 text-muted-foreground">
                  {metadata.subjectsUsed.length
                    ? metadata.subjectsUsed.join(", ")
                    : "None"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              Applied filter metadata is unavailable for this legacy
              recommendation run.
            </p>
          )}
        </section>
      )}
      {result.state !== "loaded" ? (
        <p
          role={result.state === "error" ? "alert" : undefined}
          className="rounded-lg border p-6 text-muted-foreground"
        >
          {result.state === "empty"
            ? "This recommendation run has no saved books."
            : result.state === "error"
              ? "Saved recommendations couldn’t be loaded. Try again later."
              : "These saved recommendations are unavailable."}
        </p>
      ) : (
        <>
          <div className="relative">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {visibleBooks.map((book, index) => {
                const [, , , color, art] =
                  decorations[(page * 4 + index) % decorations.length];
                const title = book.title || "Title unavailable";
                const author =
                  book.author_name?.filter(Boolean).join(", ") ||
                  "Author unavailable";
                const year = book.first_publish_year ?? "Year unavailable";
                return (
                  <article
                    key={book.key}
                    className="min-w-0 rounded-xl border bg-card p-3 shadow-sm"
                  >
                    <div
                      aria-hidden="true"
                      className={`flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${color} p-5 text-center text-white`}
                    >
                      <div className="flex size-full flex-col items-center justify-center border border-white/35 px-3 shadow-inner">
                        <span className="mb-4 text-3xl opacity-80">{art}</span>
                        <span className="font-serif text-xl leading-tight tracking-wide uppercase">
                          {title}
                        </span>
                        <span className="mt-4 text-[10px] tracking-[0.2em] uppercase">
                          {author}
                        </span>
                      </div>
                    </div>
                    <h2 className="mt-3 line-clamp-2 font-serif text-lg leading-snug font-semibold">
                      {title}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {author}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{year}</p>
                  </article>
                );
              })}
            </div>
            <div className="absolute -left-3 top-1/2 hidden -translate-y-1/2 sm:block">
              <Button
                aria-label="Previous recommendations"
                variant="outline"
                size="icon"
                className="rounded-full bg-background shadow"
                disabled={page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                <ChevronLeft />
              </Button>
            </div>
            <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block">
              <Button
                aria-label="Next recommendations"
                variant="outline"
                size="icon"
                className="rounded-full bg-background shadow"
                disabled={page === pageCount - 1}
                onClick={() =>
                  setPage((current) => Math.min(pageCount - 1, current + 1))
                }
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {page * 4 + 1}–{Math.min(page * 4 + 4, books.length)} of{" "}
              {books.length}
            </p>
            <div
              aria-label="Recommendation pages"
              className="flex items-center gap-2"
            >
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show recommendations ${index + 1}`}
                  aria-current={page === index ? "page" : undefined}
                  onClick={() => setPage(index)}
                  className={`size-3 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${page === index ? "bg-emerald-800" : "bg-muted-foreground/30"}`}
                />
              ))}
            </div>
            <div className="flex gap-2 sm:hidden">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                <ChevronLeft /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pageCount - 1}
                onClick={() =>
                  setPage((value) => Math.min(pageCount - 1, value + 1))
                }
              >
                Next <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
