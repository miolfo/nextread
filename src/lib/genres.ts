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
