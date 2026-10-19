"use client";

import { useState, type ReactNode } from "react";
import { BookOpen, Hash, MessageCircle, Sparkles, Target } from "lucide-react";
import { GenreSelector, type Genre } from "@/components/genre-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COUNTS = ["5", "10", "20"];
const FOCUSES = [
  "Balanced",
  "Similar to my favorite books",
  "Explore something different",
  "Discover new authors",
];

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
  const [request, setRequest] = useState("");
  const [count, setCount] = useState("10");
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [selectedImport, setSelectedImport] = useState("");
  const [included, setIncluded] = useState<Genre[]>([]);
  const [excluded, setExcluded] = useState<Genre[]>([]);
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

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardContent className="space-y-0 p-0">
        <section
          className="space-y-4 p-5 sm:p-6"
          aria-labelledby="prompt-heading"
        >
          <div className="flex items-center gap-3">
            <MessageCircle aria-hidden="true" className="size-5" />
            <div>
              <h2 id="prompt-heading" className="font-semibold">
                Optional prompt
              </h2>
              <p className="text-sm text-muted-foreground">
                Describe what you&apos;re looking for, or leave this blank.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="request" className="sr-only">
              Optional prompt
            </Label>
            <Textarea
              id="request"
              maxLength={500}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="min-h-28"
              placeholder={
                "E.g. “Suggest me engaging fantasy books with strong character development”, “Books similar to Project Hail Mary”, or “Something cozy and easy to read”."
              }
            />
            <p
              className="text-right text-xs text-muted-foreground"
              aria-live="polite"
            >
              {request.length}/500
            </p>
          </div>
        </section>

        <ControlRow
          icon={Hash}
          title="Number of recommendations"
          description="Choose how many books to find."
        >
          <Select
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
          title="Focus"
          description="Influence how the recommendations are generated."
        >
          <div className="space-y-2">
            <Select
              value={focus}
              onValueChange={(value) => value && setFocus(value)}
            >
              <SelectTrigger aria-label="Focus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOCUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {focus === "Balanced"
                ? "A mix of popularity, similarity to your taste, and variety."
                : focus}
            </p>
          </div>
        </ControlRow>

        <ControlRow
          icon={BookOpen}
          title="Include genres"
          description="Add genres you’re interested in."
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
          description="Add genres you want to avoid."
        >
          <GenreSelector
            label="Exclude genres"
            selected={excluded}
            onToggle={(genre) => toggleGenre(genre, "exclude")}
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
        <Button type="button" className="w-full">
          <Sparkles aria-hidden="true" />
          Generate recommendations
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
    <section className="grid gap-4 border-t p-5 sm:grid-cols-2 sm:items-center sm:p-6">
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
