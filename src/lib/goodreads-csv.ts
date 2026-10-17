import { parse } from "csv-parse/sync";

const BOOK_FIELDS = [
  "Title",
  "Author",
  "Additional Authors",
  "ISBN",
  "My Rating",
  "Original Publication Year",
  "Date Read",
] as const;

export type GoodreadsBook = Record<(typeof BOOK_FIELDS)[number], string>;

export function parseGoodreadsCsv(csv: string): GoodreadsBook[] {
  const rows = parse(csv, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return rows
    .filter((row) => row["Exclusive Shelf"] === "read")
    .map((row) => {
      const book = Object.fromEntries(
        BOOK_FIELDS.map((field) => [field, row[field] ?? ""]),
      ) as GoodreadsBook;
      book.ISBN = book.ISBN.replace(/^="(.*)"$/, "$1");
      return book;
    });
}
