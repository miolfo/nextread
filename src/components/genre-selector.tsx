"use client";

import { useId } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export const GENRES = [
  "Science Fiction",
  "Fantasy",
  "Mystery",
  "Thriller",
  "Romance",
  "Historical Fiction",
  "Literary Fiction",
  "Nonfiction",
] as const;
export type Genre = (typeof GENRES)[number];

export function GenreSelector({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: Genre[];
  onToggle: (genre: Genre) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((genre) => (
            <Badge
              key={genre}
              variant="secondary"
              className="max-w-full gap-1 whitespace-normal"
            >
              {genre}
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove ${genre} from ${label.toLowerCase()}`}
                onClick={() => onToggle(genre)}
              >
                <X aria-hidden="true" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
            />
          }
          id={id}
        >
          Add a genre… <ChevronsUpDown aria-hidden="true" />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--anchor-width) max-w-[calc(100vw-2rem)] p-0"
        >
          <PopoverTitle className="sr-only">{label}</PopoverTitle>
          <Command>
            <CommandInput
              aria-label={`Search ${label.toLowerCase()}`}
              placeholder="Search genres…"
            />
            <CommandList>
              <CommandEmpty>No genres found.</CommandEmpty>
              <CommandGroup>
                {GENRES.map((genre) => (
                  <CommandItem
                    key={genre}
                    value={genre}
                    data-checked={selected.includes(genre)}
                    aria-checked={selected.includes(genre)}
                    onSelect={() => onToggle(genre)}
                  >
                    {genre}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
