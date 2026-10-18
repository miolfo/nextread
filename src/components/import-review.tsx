"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ReviewBook = {
  id: string;
  title: string | null;
  author: string | null;
  my_rating: string | null;
  date_read: string | null;
};

function readDate(value: string | null) {
  if (!value?.trim()) return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (match) {
    const [, month, day, year] = match;
    const date = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    if (
      date.getUTCFullYear() !== Number(year) ||
      date.getUTCMonth() !== Number(month) - 1 ||
      date.getUTCDate() !== Number(day)
    )
      return null;
    return {
      date,
      display: `${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`,
    };
  }
  const isoMatch = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(value.trim());
  if (!isoMatch) return null;
  const [, year, month, day] = isoMatch;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day)
  )
    return null;
  return { date, display: `${year}-${month}-${day}` };
}

function validRating(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5
    ? Math.floor(rating)
    : null;
}

export function ImportReview({
  books,
  unavailable = false,
}: {
  books: ReviewBook[];
  unavailable?: boolean;
}) {
  const router = useRouter();
  const ratedBooks = books.flatMap((book) => {
    const rating = validRating(book.my_rating);
    return rating === null ? [] : [{ book, rating }];
  });
  const authors = new Set(
    books.map((book) => book.author?.trim()).filter(Boolean),
  );
  const ratingCounts = Array.from({ length: 5 }, (_, index) => {
    const rating = 5 - index;
    const count = ratedBooks.filter((entry) => entry.rating === rating).length;
    return {
      rating,
      count,
      percent: ratedBooks.length
        ? Math.round((count / ratedBooks.length) * 100)
        : 0,
    };
  });
  const latestReads = books
    .map((book) => ({ book, parsedDate: readDate(book.date_read) }))
    .filter(
      (
        entry,
      ): entry is {
        book: ReviewBook;
        parsedDate: NonNullable<ReturnType<typeof readDate>>;
      } => Boolean(entry.parsedDate),
    )
    .sort((a, b) => b.parsedDate.date.getTime() - a.parsedDate.date.getTime())
    .slice(0, 5);

  return (
    <section className="space-y-6" aria-labelledby="review-title">
      <div className="flex items-center justify-center gap-3 text-sm text-emerald-900">
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-white">
            ✓
          </span>
          Import
        </span>
        <span aria-hidden="true" className="w-16 border-t" />
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-950 text-white">
            2
          </span>
          Review
        </span>
      </div>
      <header className="space-y-2 text-center">
        <h2 id="review-title" className="text-3xl font-semibold tracking-tight">
          Import review
        </h2>
        <p className="text-muted-foreground">
          Review the books saved from this import.
        </p>
      </header>
      {unavailable ? (
        <p
          role="alert"
          className="rounded-md border p-4 text-sm text-muted-foreground"
        >
          Import data is currently unavailable. Please try again later.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                [BookOpen, books.length, "Total books"],
                [Star, ratedBooks.length, "Rated books"],
                [Users, authors.size, "Unique authors"],
              ] as [LucideIcon, number, string][]
            ).map(([Icon, count, label]) => (
              <Card key={label as string} className="bg-emerald-50/50">
                <CardContent className="flex items-center gap-4 pt-6">
                  <span className="grid size-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-950">
                    <Icon aria-hidden="true" className="size-7" />
                  </span>
                  <div>
                    <p className="text-3xl font-semibold">{count as number}</p>
                    <p className="text-sm text-muted-foreground">
                      {label as string}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Ratings distribution</CardTitle>
              <p className="text-sm text-muted-foreground">
                Distribution of saved book ratings.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {ratingCounts.map(({ rating, count, percent }) => (
                <div
                  key={rating}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                >
                  <span className="flex min-w-24 items-center gap-2">
                    {rating} {rating === 1 ? "star" : "stars"}
                    <Star
                      aria-hidden="true"
                      className="size-4 fill-amber-500 text-amber-500"
                    />
                  </span>
                  <span className="h-3 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-emerald-800"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    {count} ({percent}%)
                  </span>
                </div>
              ))}
              {!ratedBooks.length && (
                <p className="text-sm text-muted-foreground">No rated books.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Latest reads</CardTitle>
              <p className="text-sm text-muted-foreground">
                Books with a saved read date, newest first.
              </p>
            </CardHeader>
            <CardContent>
              {latestReads.length ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {latestReads.map(({ book, parsedDate }) => (
                    <div key={book.id} className="space-y-1">
                      <p className="font-medium">
                        {book.title?.trim() || "Title unavailable"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {book.author?.trim() || "Author unavailable"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Read {parsedDate.display}
                      </p>
                      <p className="text-sm">
                        {validRating(book.my_rating) !== null
                          ? `${validRating(book.my_rating)} out of 5 stars`
                          : "Rating unavailable"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No books with a valid read date.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.replace("/app/import")}
        >
          <ArrowLeft />
          Import a different file
        </Button>
        <Button
          nativeButton={false}
          role="link"
          render={<Link href="/app/recommendations" />}
        >
          <span>Continue to recommendations</span>
          <ArrowRight />
        </Button>
      </div>
    </section>
  );
}
