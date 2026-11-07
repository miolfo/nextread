import { BookOpen, File, Star, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type ImportedBook = {
  author: string | null;
  my_rating: string | null;
};

export type ImportRun = {
  id: string;
  original_filename: string | null;
  created_at: string;
  books: ImportedBook[];
};

function validRating(value: string | null) {
  if (value === null || value.trim() === "") return null;
  const rating = Number(value);
  return Number.isFinite(rating) && rating >= 1 && rating <= 5 ? rating : null;
}

function formatImportedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ImportHistory({
  imports = [],
  error = false,
}: {
  imports?: ImportRun[];
  error?: boolean;
}) {
  if (error) {
    return (
      <section className="space-y-4" aria-labelledby="import-history-error">
        <h1
          id="import-history-error"
          className="text-3xl font-semibold tracking-tight"
        >
          Import history unavailable
        </h1>
        <p role="alert" className="text-muted-foreground">
          We couldn’t load your import history. Please try again.
        </p>
        <Button
          nativeButton={false}
          role="link"
          render={<Link href="/app/history" />}
          variant="outline"
        >
          Retry
        </Button>
      </section>
    );
  }

  const books = imports.flatMap((item) => item.books);
  const ratings = books
    .map((book) => validRating(book.my_rating))
    .filter((rating): rating is number => rating !== null);
  const authors = new Set(
    books.map((book) => book.author?.trim()).filter((author) => author),
  );
  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((total, rating) => total + rating, 0) / ratings.length)
          .toFixed(1)
          .replace(/\.0$/, "")
      : "—";
  const summaries = [
    {
      label: "Total books",
      value: books.length.toLocaleString(),
      detail: "Across all imports",
      icon: BookOpen,
    },
    {
      label: "Rated books",
      value: ratings.length.toLocaleString(),
      detail: "Books with a valid rating",
      icon: Star,
    },
    {
      label: "Average rating",
      value: averageRating,
      detail: ratings.length ? "Out of 5" : "No valid ratings yet",
      icon: Star,
    },
    {
      label: "Unique authors",
      value: authors.size.toLocaleString(),
      detail: "Across all books",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">History</h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            Here are all the files you’ve imported from Goodreads. You can
            import more files or view the details of each import.
          </p>
        </div>
        <Button
          nativeButton={false}
          role="link"
          render={<Link href="/app/import" />}
        >
          Import another Goodreads file
        </Button>
      </div>

      <section
        aria-label="Import summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {summaries.map(({ label, value, detail, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-4 pt-4">
              <Icon
                aria-hidden="true"
                className="size-8 shrink-0 text-muted-foreground"
              />
              <div>
                <p className="text-2xl font-semibold">{value}</p>
                <p className="font-medium">{label}</p>
                <p className="text-muted-foreground">{detail}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4" aria-labelledby="import-history-heading">
        <div>
          <h2
            id="import-history-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            Import history
          </h2>
          <p className="text-sm text-muted-foreground">
            A list of all your imported Goodreads files and a summary of their
            contents.
          </p>
        </div>
        {imports.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center">
              <p className="font-medium">No imports yet</p>
              <p className="text-sm text-muted-foreground">
                Import your Goodreads library to see its books and reading
                statistics here.
              </p>
              <Button
                nativeButton={false}
                role="link"
                render={<Link href="/app/import" />}
              >
                Import a Goodreads file
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th
                    className="px-4 py-3 text-right font-medium whitespace-nowrap"
                    scope="col"
                  >
                    File name
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Imported
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Books
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Rated
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Average rating
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Authors
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {imports.map((item) => {
                  const itemRatings = item.books
                    .map((book) => validRating(book.my_rating))
                    .filter((rating): rating is number => rating !== null);
                  const itemAuthors = new Set(
                    item.books
                      .map((book) => book.author?.trim())
                      .filter((author) => author),
                  );
                  const itemAverage = itemRatings.length
                    ? (
                        itemRatings.reduce(
                          (total, rating) => total + rating,
                          0,
                        ) / itemRatings.length
                      )
                        .toFixed(1)
                        .replace(/\.0$/, "")
                    : "—";

                  return (
                    <tr key={item.id}>
                      <th className="px-4 py-4 font-medium" scope="row">
                        <span className="flex items-center gap-3">
                          <File
                            aria-hidden="true"
                            className="size-5 shrink-0"
                          />
                          {item.original_filename || "Filename unavailable"}
                        </span>
                      </th>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatImportedAt(item.created_at)}
                      </td>
                      <td className="px-4 py-4">{item.books.length}</td>
                      <td className="px-4 py-4">{itemRatings.length}</td>
                      <td className="px-4 py-4">{itemAverage}</td>
                      <td className="px-4 py-4">{itemAuthors.size}</td>
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <Button
                          nativeButton={false}
                          role="link"
                          render={
                            <Link
                              href={`/app/import?importId=${encodeURIComponent(item.id)}`}
                            />
                          }
                          variant="outline"
                          size="sm"
                        >
                          View details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
