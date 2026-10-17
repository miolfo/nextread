import { BookOpen, CircleCheck, Star, Users, File } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const imports = [
  {
    id: "goodreads-2025",
    filename: "goodreads_export_2025.csv",
    size: "1.2 MB",
    imported: "Oct 14, 2026 · 10:24",
    books: 237,
    rated: 214,
    ratedPercent: "90%",
    read: 23,
    readPercent: "10%",
    authors: 156,
    genres: ["Science Fiction", "Fantasy", "Adventure"],
  },
  {
    id: "goodreads-2024",
    filename: "goodreads_export_2024.csv",
    size: "980 KB",
    imported: "Jan 3, 2025 · 14:12",
    books: 125,
    rated: 98,
    ratedPercent: "78%",
    read: 67,
    readPercent: "54%",
    authors: 89,
    genres: ["Fantasy", "Mystery", "Fiction"],
  },
  {
    id: "goodreads-2023",
    filename: "goodreads_export_2023.csv",
    size: "862 KB",
    imported: "Jan 8, 2024 · 09:41",
    books: 78,
    rated: 62,
    ratedPercent: "79%",
    read: 52,
    readPercent: "67%",
    authors: 61,
    genres: ["Science Fiction", "Thriller", "Mystery"],
  },
  {
    id: "goodreads-2022",
    filename: "goodreads_export_2022.csv",
    size: "756 KB",
    imported: "Jan 10, 2023 · 16:20",
    books: 32,
    rated: 24,
    ratedPercent: "75%",
    read: 14,
    readPercent: "44%",
    authors: 28,
    genres: ["Fantasy", "Adventure", "Romance"],
  },
];

const summaries = [
  {
    label: "Total books",
    value: "472",
    detail: "Across all imports",
    icon: BookOpen,
  },
  {
    label: "Rated books",
    value: "398",
    detail: "84% of all books",
    icon: Star,
  },
  {
    label: "Marked as read",
    value: "156",
    detail: "33% of all books",
    icon: CircleCheck,
  },
  {
    label: "Unique authors",
    value: "287",
    detail: "Across all books",
    icon: Users,
  },
];

export function ImportHistory() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Imported files
          </h1>
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
        <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-medium" scope="col">
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
                  Read
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Authors
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Top genres
                </th>
                <th className="px-4 py-3 font-medium" scope="col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {imports.map((item) => (
                <tr key={item.id}>
                  <th className="px-4 py-4 font-medium" scope="row">
                    <span className="flex items-center gap-3">
                      <File aria-hidden="true" className="size-5 shrink-0" />
                      <span>
                        {item.filename}
                        <span className="block font-normal text-muted-foreground">
                          {item.size}
                        </span>
                      </span>
                    </span>
                  </th>
                  <td className="px-4 py-4 text-muted-foreground">
                    {item.imported}
                  </td>
                  <td className="px-4 py-4">{item.books}</td>
                  <td className="px-4 py-4">
                    {item.rated}
                    <span className="block text-muted-foreground">
                      {item.ratedPercent}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {item.read}
                    <span className="block text-muted-foreground">
                      {item.readPercent}
                    </span>
                  </td>
                  <td className="px-4 py-4">{item.authors}</td>
                  <td className="px-4 py-4">
                    <div className="flex max-w-64 flex-wrap gap-1.5">
                      {item.genres.map((genre) => (
                        <span
                          className="rounded-md bg-muted px-2 py-1 text-xs"
                          key={genre}
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
