import { describe, expect, it } from "vitest";
import {
  candidateBooks,
  buildSubjectSearchUrl,
  excludeImportedAndDeduplicate,
  selectSubjects,
  validateSearchBooks,
} from "@/lib/recommendations-engine";

const isbn = (body: string) => {
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
};

describe("recommendation candidate selection", () => {
  it("normalizes selected subjects to Open Library subject keys and constrains the whole OR to English editions", () => {
    const url = buildSubjectSearchUrl([
      " Science / Fiction: (A.B)'s ",
      "SCIENCE FICTIONABs",
      'Romance\\Drama"',
      "Café—Noir",
    ]);

    expect(url.searchParams.get("q")).toBe(
      '(subject_key:"_science__fiction_(a.b)\'s_" OR subject_key:"science_fictionabs" OR subject_key:"romancedrama" OR subject_key:"café—noir") AND language:eng',
    );
  });

  it("validates no more than ten search candidates", () => {
    const docs = Array.from({ length: 12 }, (_, index) => ({
      key: `/works/OL${index + 1}W`,
      title: `Book ${index + 1}`,
    }));

    expect(validateSearchBooks({ docs })).toHaveLength(10);
    expect(validateSearchBooks({ docs }).at(-1)?.key).toBe("/works/OL10W");
  });

  it("omits provider edition fields while retaining work ISBNs", () => {
    const [book, second] = validateSearchBooks({
      docs: [
        {
          key: "/works/OL1W",
          title: "Work title",
          isbn: ["9780306406157"],
          editions: {
            numFound: 42,
            start: 0,
            docs: [
              { key: "/books/OL2M", title: "Edition title", language: ["eng"] },
            ],
          },
        },
        { key: "/works/OL4W", title: "Second work", editions: { docs: [] } },
      ],
    });
    expect(book).toMatchObject({
      key: "/works/OL1W",
      isbn: ["9780306406157"],
      title: "Work title",
    });
    expect(book).not.toHaveProperty("editions");
    expect(second).not.toHaveProperty("editions");
  });

  it("excludes imported ISBNs beyond the bounded returned ISBN metadata", () => {
    const importedIsbn = isbn("978030640615");
    const providerIsbns = Array.from({ length: 20 }, (_, index) =>
      isbn(`978030640${String(index).padStart(3, "0")}`),
    );
    const [book] = validateSearchBooks({
      docs: [
        {
          key: "/works/OL99W",
          title: "Already imported",
          isbn: [...providerIsbns, importedIsbn],
        },
      ],
    });

    expect(book.isbn).toHaveLength(20);
    expect(
      excludeImportedAndDeduplicate(
        [book],
        [
          {
            title: "Imported",
            isbn: importedIsbn,
            isbn13: null,
            my_rating: "5",
          },
        ],
      ),
    ).toEqual([]);
  });

  it("selects the three most frequent subjects and randomizes tied subjects at the cutoff", () => {
    const books = [
      {
        title: "first",
        subjects: [
          "Common",
          "Tie A",
          "Tie B",
          "Tie C",
          "Tie D",
          "Tie E",
          "Tie F",
        ],
      },
      { title: "second", subjects: ["Common"] },
      { title: "third", subjects: ["Common"] },
    ];

    const first = selectSubjects(books, () => 0);
    const second = selectSubjects(books, () => 0.5);

    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    expect(first[0]).toBe("Common");
    expect(second[0]).toBe("Common");
    expect(first.slice(1)).not.toEqual(second.slice(1));
    expect(
      first.every((subject) =>
        [
          "Common",
          "Tie A",
          "Tie B",
          "Tie C",
          "Tie D",
          "Tie E",
          "Tie F",
        ].includes(subject),
      ),
    ).toBe(true);
  });

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
