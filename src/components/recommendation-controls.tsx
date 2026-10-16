"use client";

import { useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import { GenreSelector, type Genre } from "@/components/genre-selector";
import { RecommendationGrid } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const COUNTS = ["5", "10", "20"];
const FOCUSES = [
  "No specific focus",
  "Similar to my favorite books",
  "Explore something different",
  "Discover new authors",
];

function CountSelector({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Number of recommendations</Label>
      <Select value={value} onValueChange={(next) => next && onChange(next)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTS.map((count) => (
            <SelectItem key={count} value={count}>
              {count}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RecommendationControls() {
  const [request, setRequest] = useState("");
  const [aiCount, setAiCount] = useState("10");
  const [randomCount, setRandomCount] = useState("10");
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [included, setIncluded] = useState<Genre[]>([]);
  const [excluded, setExcluded] = useState<Genre[]>([]);
  const [lesserKnown, setLesserKnown] = useState(true);

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
    <RecommendationGrid>
      <Card className="min-w-0">
        <CardHeader>
          <Sparkles aria-hidden="true" className="mb-2 size-6" />
          <CardTitle>
            <h2>AI Recommendations</h2>
          </CardTitle>
          <CardDescription>
            Ask AI for personalized book suggestions based on your reading
            history, ratings, and reviews.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="request">Your request</Label>
            <Textarea
              id="request"
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="min-h-28"
              placeholder="Suggest some fast-paced science fiction books similar to Project Hail Mary, but with a more mysterious tone."
            />
          </div>
          <CountSelector id="ai-count" value={aiCount} onChange={setAiCount} />
          <div className="space-y-2">
            <Label htmlFor="focus">Focus (optional)</Label>
            <Select
              items={FOCUSES.map((value) => ({ value, label: value }))}
              value={focus}
              onValueChange={(next) => next && setFocus(next)}
            >
              <SelectTrigger id="focus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOCUSES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="mt-auto">
          <Button type="button" className="w-full">
            <Sparkles aria-hidden="true" />
            Get AI Recommendations
          </Button>
        </CardFooter>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <Shuffle aria-hidden="true" className="mb-2 size-6" />
          <CardTitle>
            <h2>Randomized Recommendations</h2>
          </CardTitle>
          <CardDescription>
            Discover books using your preferred genres and book reviews, with
            book data from Open Library.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <CountSelector
            id="random-count"
            value={randomCount}
            onChange={setRandomCount}
          />
          <GenreSelector
            label="Include genres"
            selected={included}
            onToggle={(genre) => toggleGenre(genre, "include")}
          />
          <GenreSelector
            label="Exclude genres"
            selected={excluded}
            onToggle={(genre) => toggleGenre(genre, "exclude")}
          />
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="lesser-known">Include lesser-known books</Label>
            <Switch
              id="lesser-known"
              checked={lesserKnown}
              onCheckedChange={setLesserKnown}
            />
          </div>
        </CardContent>
        <CardFooter className="mt-auto">
          <Button type="button" className="w-full">
            <Shuffle aria-hidden="true" />
            Generate Recommendations
          </Button>
        </CardFooter>
      </Card>
    </RecommendationGrid>
  );
}
