export const GENRE_SUBJECTS = {
  "Science Fiction": "science_fiction",
  Fantasy: "fantasy",
  Mystery: "mystery",
  Thriller: "thriller",
  Romance: "romance",
  "Historical Fiction": "historical_fiction",
  Horror: "horror",
  Adventure: "adventure",
  Biography: "biography",
  Autobiography: "autobiography",
  History: "history",
  Science: "science",
  Philosophy: "philosophy",
  Poetry: "poetry",
  "Young Adult": "young_adult",
} as const;

export const GENRES = Object.keys(
  GENRE_SUBJECTS,
) as (keyof typeof GENRE_SUBJECTS)[];

export type Genre = (typeof GENRES)[number];
