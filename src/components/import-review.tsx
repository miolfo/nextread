"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CircleCheck,
  Star,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ratings = [
  ["5 stars", "84", "39%", "w-[71%]"],
  ["4 stars", "72", "34%", "w-[61%]"],
  ["3 stars", "43", "20%", "w-[36%]"],
  ["2 stars", "18", "8%", "w-[15%]"],
  ["1 star", "5", "2%", "w-[5%]"],
];
const genres = [
  ["Science Fiction", "92", "39%", "w-[72%]"],
  ["Fantasy", "68", "29%", "w-[53%]"],
  ["Adventure", "41", "17%", "w-[32%]"],
  ["Mystery", "24", "10%", "w-[19%]"],
  ["Fiction", "18", "8%", "w-[14%]"],
];
const books = [
  ["Project Hail Mary", "Andy Weir", "★★★★★"],
  ["Dune", "Frank Herbert", "★★★★☆"],
  ["The Martian", "Andy Weir", "★★★★★"],
  ["A Memory Called Empire", "Arkady Martine", "★★★★☆"],
  ["Children of Time", "Adrian Tchaikovsky", "★★★★☆"],
];

function DistributionCard({
  title,
  description,
  rows,
  numbered = false,
}: {
  title: string;
  description: string;
  rows: string[][];
  numbered?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map(([label, count, percent, width], index) => (
          <div
            key={label}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 text-sm"
          >
            <span className="flex min-w-24 items-center gap-2">
              {numbered ? (
                <span className="grid size-6 place-items-center rounded-full bg-muted font-medium">
                  {index + 1}
                </span>
              ) : (
                <>
                  {label}
                  <Star
                    aria-hidden="true"
                    className="size-4 fill-amber-500 text-amber-500"
                  />
                </>
              )}
              {numbered && label}
            </span>
            <span className="h-3 overflow-hidden rounded-full bg-muted">
              <span
                className={`block h-full rounded-full bg-emerald-800 ${width}`}
              />
            </span>
            <span className="whitespace-nowrap text-muted-foreground">
              {count} ({percent})
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function ImportReview() {
  const router = useRouter();
  return (
    <section className="space-y-6" aria-labelledby="review-title">
      <div className="flex items-center justify-center gap-3 text-sm text-emerald-900">
        <span className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-white">
            <Check className="size-4" />
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
          Illustrative import review
        </h2>
        <p className="text-muted-foreground">
          This example review shows how a library summary could look. The
          figures and books below are mock content, not results from your file.
        </p>
      </header>
      <p
        role="note"
        className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
      >
        Illustrative demo only: your uploaded file was not processed, and none
        of the statistics or books shown here come from your data.
      </p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [BookOpen, "237", "Example books"],
          [Star, "214", "Example rated books"],
          [CircleCheck, "23", "Example read books"],
          [Users, "156", "Example authors"],
        ].map(([Icon, count, label]) => (
          <Card key={label as string} className="bg-emerald-50/50">
            <CardContent className="flex items-center gap-4 pt-6">
              <span className="grid size-14 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-950">
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <div>
                <p className="text-3xl font-semibold">{count as string}</p>
                <p className="text-sm text-muted-foreground">
                  {label as string}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionCard
          title="Ratings distribution"
          description="Illustrative breakdown of book ratings."
          rows={ratings}
        />
        <DistributionCard
          title="Top genres"
          description="Illustrative distribution of book genres."
          rows={genres}
          numbered
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Example books</CardTitle>
          <p className="text-sm text-muted-foreground">
            These sample titles are illustrative and are not from your file.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {books.map(([title, author, rating]) => (
            <div key={title} className="space-y-1">
              <p className="font-medium">{title}</p>
              <p className="text-sm text-muted-foreground">{author}</p>
              <p
                aria-label={`${rating.replaceAll("☆", "").length} out of 5 stars`}
                className="text-amber-500"
              >
                {rating}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
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
