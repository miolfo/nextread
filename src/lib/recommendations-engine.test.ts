import { describe, expect, it } from "vitest";
import { candidateBooks } from "@/lib/recommendations-engine";

const isbn = (body: string) => {
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
};

describe("recommendation candidate selection", () => {
  it("accepts zero and fractional ratings, canonicalizes duplicates, and prefers ISBN13", () => {
    const bookIsbn13 = isbn("978030640615");
    const result = candidateBooks(
      [
        { title: "fraction", isbn: null, isbn13: bookIsbn13, my_rating: "4.5" },
        { title: "duplicate", isbn: bookIsbn13, isbn13: null, my_rating: "4" },
        {
          title: "zero",
          isbn: isbn("978030640615"),
          isbn13: null,
          my_rating: "0",
        },
        { title: "invalid", isbn: null, isbn13: null, my_rating: "6" },
      ],
      () => 0,
    );
    expect(result).toEqual([{ title: "fraction", isbn: bookIsbn13 }]);
  });

  it("takes the top 30 before ISBN filtering without backfill", () => {
    const books = Array.from({ length: 31 }, (_, index) => ({
      title: `book ${index}`,
      isbn: index === 30 ? isbn("978030640615") : null,
      isbn13: null,
      my_rating: index === 30 ? "4" : "5",
    }));
    expect(candidateBooks(books, () => 0)).toEqual([]);
  });
});
