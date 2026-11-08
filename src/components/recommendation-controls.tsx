"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Database, Sparkles, Target } from "lucide-react";
import { GenreSelector, type Genre } from "@/components/genre-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isValidRecommendationId } from "@/lib/recommendations/results";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Highest rated" },
  { value: "random", label: "Random" },
] as const;

export type RecommendationImport = {
  id: string;
  original_filename: string | null;
  created_at: string;
};

function formatImportDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

export function RecommendationControls({
  imports = [],
  importError = false,
}: {
  imports?: RecommendationImport[];
  importError?: boolean;
}) {
  const [sort, setSort] =
    useState<(typeof SORTS)[number]["value"]>("relevance");
  const [selectedImport, setSelectedImport] = useState("");
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [lengths, setLengths] = useState<string[]>([]);
  const [included, setIncluded] = useState<Genre[]>([]);
  const [excluded, setExcluded] = useState<Genre[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const selectedImportData = imports.find((item) => item.id === selectedImport);
  const reversedYears =
    fromYear !== "" && toYear !== "" && Number(fromYear) > Number(toYear);
  const invalidYear = [fromYear, toYear].some(
    (year) =>
      year !== "" &&
      (!Number.isInteger(Number(year)) ||
        Number(year) < 0 ||
        Number(year) > 2100),
  );
  const invalidFilters = reversedYears || invalidYear;

  function toggleGenre(genre: Genre, target: "include" | "exclude") {
    const setTarget = target === "include" ? setIncluded : setExcluded;
    const setOther = target === "include" ? setExcluded : setIncluded;
    setTarget((current) =>
      current.includes(genre)
        ? current.filter((item) => item !== genre)
        : [...current, genre],
    );
    setOther((current) => current.filter((item) => item !== genre));
  }

  async function recommend() {
    if (pending || !selectedImport || invalidFilters) return;
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importId: selectedImport,
          sort,
          fromYear: fromYear ? Number(fromYear) : undefined,
          toYear: toYear ? Number(toYear) : undefined,
          ...(lengths.length ? { lengths } : {}),
          ...(included.length ? { includedGenres: included } : {}),
          ...(excluded.length ? { excludedGenres: excluded } : {}),
        }),
      });
      const result: unknown = await response.json();
      if (
        !response.ok ||
        !result ||
        typeof result !== "object" ||
        !("ok" in result) ||
        result.ok !== true ||
        !("recommendationId" in result) ||
        !isValidRecommendationId(result.recommendationId)
      ) {
        setError(true);
        return;
      }
      globalThis.location.assign(
        new URL(
          `/app/recommendation-results?recommendationId=${encodeURIComponent(result.recommendationId)}`,
          globalThis.location.origin,
        ).href,
      );
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-5xl">
      <CardContent className="space-y-0 p-0">
        <ControlRow
          icon={Target}
          title="Sorted by"
          description="Choose how search results are ordered."
        >
          <div className="space-y-2">
            <Select
              items={SORTS}
              value={sort}
              onValueChange={(value) => value && setSort(value as typeof sort)}
            >
              <SelectTrigger aria-label="Sorted by" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Highest rated requires at least 10 ratings. Relevance uses the
              search service’s default ordering; random asks it for a randomized
              order.
            </p>
          </div>
        </ControlRow>

        <ControlRow
          icon={BookOpen}
          title="Include genres"
          description="Match at least one selected genre."
        >
          <GenreSelector
            label="Include genres"
            selected={included}
            onToggle={(genre) => toggleGenre(genre, "include")}
          />
        </ControlRow>

        <ControlRow
          icon={BookOpen}
          title="Exclude genres"
          description="Exclude books matching any selected genre."
        >
          <GenreSelector
            label="Exclude genres"
            selected={excluded}
            onToggle={(genre) => toggleGenre(genre, "exclude")}
          />
        </ControlRow>

        <ControlRow
          icon={Target}
          title="Publication year"
          description="Limit results to books published within a year range."
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1 text-sm">
              From year
              <Input
                aria-label="From year"
                type="number"
                min="0"
                max="2100"
                step="1"
                value={fromYear}
                onChange={(event) => setFromYear(event.target.value)}
                aria-invalid={invalidYear || reversedYears}
              />
            </label>
            <label className="space-y-1 text-sm">
              To year
              <Input
                aria-label="To year"
                type="number"
                min="0"
                max="2100"
                step="1"
                value={toYear}
                onChange={(event) => setToYear(event.target.value)}
                aria-invalid={invalidYear || reversedYears}
              />
            </label>
          </div>
          {invalidYear ? (
            <p role="alert" className="col-span-full text-sm text-destructive">
              Enter whole years from 0 through 2100.
            </p>
          ) : reversedYears ? (
            <p role="alert" className="col-span-full text-sm text-destructive">
              From year must be less than or equal to To year.
            </p>
          ) : null}
        </ControlRow>
        <ControlRow
          icon={BookOpen}
          title="Book length"
          description="Filter by approximate book length."
        >
          <div className="flex flex-wrap gap-4">
            {(
              [
                ["short", "Under 250 pages"],
                ["medium", "250–499 pages"],
                ["long", "500 pages or more"],
              ] as const
            ).map(([length, detail]) => (
              <label key={length} className="flex min-w-24 items-start gap-2">
                <input
                  type="checkbox"
                  checked={lengths.includes(length)}
                  onChange={(event) =>
                    setLengths((current) =>
                      event.target.checked
                        ? [...current, length]
                        : current.filter((item) => item !== length),
                    )
                  }
                />
                <span className="grid">
                  <span className="font-medium">
                    {length[0].toUpperCase() + length.slice(1)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {detail}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </ControlRow>

        <ControlRow
          icon={Database}
          title="Import"
          description="Choose a Goodreads import for your recommendations."
        >
          {importError ? (
            <p role="alert" className="text-sm text-destructive">
              Your imports couldn’t be loaded. Try again later.
            </p>
          ) : imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No imports available. Import a Goodreads file to see it here.
            </p>
          ) : (
            <Select
              value={selectedImport}
              onValueChange={(value) => value && setSelectedImport(value)}
            >
              <SelectTrigger aria-label="Import" className="w-full">
                <SelectValue placeholder="Select an import">
                  {selectedImportData
                    ? `${selectedImportData.original_filename || "Filename unavailable"} — ${formatImportDate(selectedImportData.created_at)}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {imports.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.original_filename || "Filename unavailable"} —{" "}
                    {formatImportDate(item.created_at)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </ControlRow>
      </CardContent>
      <CardFooter className="border-t p-5 sm:p-6">
        {error && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            Recommendations couldn’t be generated. Please try again.
          </p>
        )}
        <Button
          type="button"
          className="w-full"
          disabled={pending || !selectedImport || invalidFilters}
          onClick={() => void recommend()}
        >
          <Sparkles aria-hidden="true" />
          {pending ? "Loading…" : "Generate recommendations"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function ControlRow({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Target;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 p-5 sm:grid-cols-2 sm:items-center sm:p-6">
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
