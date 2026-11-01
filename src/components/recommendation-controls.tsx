"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Hash, Sparkles, Target } from "lucide-react";
import { GenreSelector, type Genre } from "@/components/genre-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const COUNTS = ["5", "10", "20"];
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
  const [count, setCount] = useState("10");
  const [sort, setSort] =
    useState<(typeof SORTS)[number]["value"]>("relevance");
  const [selectedImport, setSelectedImport] = useState("");
  const [included, setIncluded] = useState<Genre[]>([]);
  const [excluded, setExcluded] = useState<Genre[]>([]);
  const [pending, setPending] = useState(false);
  const selectedImportData = imports.find((item) => item.id === selectedImport);

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
    if (pending || !selectedImport) return;
    setPending(true);
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ importId: selectedImport, sort }),
      });
    } catch {
      // The experiment deliberately has no user-facing results or error state.
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardContent className="space-y-0 p-0">
        <ControlRow
          icon={Hash}
          title="Number of recommendations"
          description="The search currently returns up to 10 books."
        >
          <Select
            disabled
            value={count}
            onValueChange={(value) => value && setCount(value)}
          >
            <SelectTrigger
              aria-label="Number of recommendations"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTS.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlRow>

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
          description="Genre filtering is not yet applied to results."
        >
          <GenreSelector
            label="Include genres"
            selected={included}
            onToggle={(genre) => toggleGenre(genre, "include")}
            disabled
          />
        </ControlRow>
        <ControlRow
          icon={BookOpen}
          title="Exclude genres"
          description="Genre filtering is not yet applied to results."
        >
          <GenreSelector
            label="Exclude genres"
            selected={excluded}
            onToggle={(genre) => toggleGenre(genre, "exclude")}
            disabled
          />
        </ControlRow>

        <section
          className="space-y-3 border-t p-5 sm:p-6"
          aria-labelledby="import-heading"
        >
          <div>
            <h2 id="import-heading" className="font-semibold">
              Import to use
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose a Goodreads import for your recommendations.
            </p>
          </div>
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
              <SelectTrigger aria-label="Import to use" className="w-full">
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
        </section>
      </CardContent>
      <CardFooter className="border-t p-5 sm:p-6">
        <Button
          type="button"
          className="w-full"
          disabled={pending || !selectedImport}
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
  icon: typeof Hash;
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
