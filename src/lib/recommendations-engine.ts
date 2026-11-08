export type Book = {
  title: string | null;
  isbn: string | null;
  isbn13: string | null;
  my_rating: string | null;
  author?: string | null;
};
export type Candidate = { title: string; isbn: string };

export type BookSubject = { title: string; subjects: string[] };

export type OpenLibraryBook = {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number;
};

export type RecommendationSort = "relevance" | "rating" | "random";
export type RecommendationFilters = {
  fromYear?: number;
  toYear?: number;
  lengths?: ("short" | "medium" | "long")[];
  includedGenres?: string[];
  excludedGenres?: string[];
};

const completeIsbns = new WeakMap<OpenLibraryBook, string[]>();

export function normalizeIsbn(value: string | null): string | null {
  if (!value || value.length > 32) return null;
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    let sum = 0;
    for (let i = 0; i < 10; i++)
      sum += (isbn[i] === "X" ? 10 : Number(isbn[i])) * (10 - i);
    if (sum % 11 !== 0) return null;
    const body = `978${isbn.slice(0, 9)}`;
    const check =
      (10 -
        ([...body].reduce(
          (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
          0,
        ) %
          10)) %
      10;
    return `${body}${check}`;
  }
  if (/^(?:978|979)\d{10}$/.test(isbn)) {
    const sum = [...isbn]
      .slice(0, 12)
      .reduce(
        (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
        0,
      );
    return (10 - (sum % 10)) % 10 === Number(isbn[12]) ? isbn : null;
  }
  return null;
}

export function selectSubjects(
  books: BookSubject[],
  random: () => number = Math.random,
): string[] {
  const counts = new Map<string, number>();
  for (const book of books) {
    for (const subject of new Set(book.subjects))
      counts.set(subject, (counts.get(subject) ?? 0) + 1);
  }
  const ranked = [...counts].map(([subject, count]) => ({ subject, count }));
  for (let i = ranked.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ranked[i], ranked[j]] = [ranked[j], ranked[i]];
  }
  return ranked
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ subject }) => subject);
}

export function buildSubjectSearchUrl(
  subjects: string[],
  sort: RecommendationSort = "relevance",
  filters: RecommendationFilters = {},
): URL {
  const url = new URL("https://openlibrary.org/search.json");
  // Open Library's str_to_key() drops these ASCII characters, lowercases,
  // and replaces spaces with underscores. Keep source subjects untouched for
  // aggregation; only normalize the search clauses here.
  const dropped = new Set(';/?:@&=+$,<>#%"{}|\\^[]`\n\r');
  const keys = [
    ...new Set(
      subjects.map((subject) =>
        [...subject.toLowerCase()]
          .filter((character) => !dropped.has(character))
          .map((character) => (character === " " ? "_" : character))
          .join(""),
      ),
    ),
  ];
  const subjectQuery = keys
    .map((key) => `subject_key:"${key.replace(/[\\"]/g, "\\$&")}"`)
    .join(" OR ");
  const clauses = [`(${subjectQuery})`, "language:eng"];
  if (filters.includedGenres?.length) {
    clauses.push(
      `(${filters.includedGenres.map((key) => `subject_key:"${key}"`).join(" OR ")})`,
    );
  }
  if (filters.excludedGenres?.length) {
    clauses.push(
      `NOT (${filters.excludedGenres.map((key) => `subject_key:"${key}"`).join(" OR ")})`,
    );
  }
  if (filters.fromYear !== undefined || filters.toYear !== undefined) {
    clauses.push(
      `first_publish_year:[${filters.fromYear ?? "*"} TO ${filters.toYear ?? "*"}]`,
    );
  }
  if (filters.lengths?.length) {
    const ranges = filters.lengths.map((length) =>
      length === "short"
        ? "number_of_pages_median:[0 TO 249]"
        : length === "medium"
          ? "number_of_pages_median:[250 TO 499]"
          : "number_of_pages_median:[500 TO *]",
    );
    clauses.push(`(${ranges.join(" OR ")})`);
  }
  url.searchParams.set("q", clauses.join(" AND "));
  url.searchParams.set("limit", "50");
  if (sort === "rating") {
    url.searchParams.set("sort", "rating");
    url.searchParams.set("ratings_count", "[10 TO *]");
  } else if (sort === "random") {
    url.searchParams.set("sort", "random");
  }
  url.searchParams.set(
    "fields",
    "key,title,author_name,author_key,first_publish_year,number_of_pages_median,isbn,cover_i",
  );
  if (url.href.length > 8_192)
    throw new Error("subject search query exceeds limit");
  return url;
}

export function validateSearchBooks(payload: unknown): OpenLibraryBook[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    return [];
  const docs = (payload as { docs?: unknown }).docs;
  if (!Array.isArray(docs)) return [];
  return docs.slice(0, 50).flatMap((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const book = raw as Record<string, unknown>;
    if (
      typeof book.key !== "string" ||
      !/^\/works\/OL\d+W$/.test(book.key) ||
      typeof book.title !== "string" ||
      !book.title.trim()
    )
      return [];
    const authors = Array.isArray(book.author_name)
      ? book.author_name
          .filter((value): value is string => typeof value === "string")
          .slice(0, 10)
          .map((value) => value.slice(0, 200))
      : undefined;
    const isbns = Array.isArray(book.isbn)
      ? book.isbn
          .filter(
            (value): value is string =>
              typeof value === "string" && value.length <= 32,
          )
          .slice(0, 20)
      : undefined;
    const authorKeys = Array.isArray(book.author_key)
      ? book.author_key
          .filter((value): value is string => typeof value === "string")
          .slice(0, 10)
      : undefined;
    const result: OpenLibraryBook = {
      key: book.key,
      title: book.title.slice(0, 300),
      ...(authors?.length ? { author_name: authors } : {}),
      ...(authorKeys?.length ? { author_key: authorKeys } : {}),
      ...(Number.isInteger(book.first_publish_year) &&
      (book.first_publish_year as number) >= 0
        ? { first_publish_year: book.first_publish_year as number }
        : {}),
      ...(isbns?.length ? { isbn: isbns } : {}),
      ...(Number.isInteger(book.cover_i) && (book.cover_i as number) > 0
        ? { cover_i: book.cover_i as number }
        : {}),
    };
    completeIsbns.set(
      result,
      Array.isArray(book.isbn)
        ? book.isbn.filter(
            (value): value is string =>
              typeof value === "string" && value.length <= 32,
          )
        : [],
    );
    return [result];
  });
}

export function excludeImportedAndDeduplicate(
  books: OpenLibraryBook[],
  imported: Book[],
): OpenLibraryBook[] {
  const importedIsbns = new Set(
    imported.flatMap((book) =>
      [book.isbn, book.isbn13].flatMap((value) => {
        const isbn = normalizeIsbn(value);
        return isbn ? [isbn] : [];
      }),
    ),
  );
  const normalizeText = (value: string) =>
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  const importedTitleAuthors = new Set(
    imported.flatMap((book) => {
      const title = book.title ? normalizeText(book.title) : "";
      const author =
        "author" in book && typeof book.author === "string"
          ? normalizeText(book.author)
          : "";
      return title && author ? [`${title}\u0000${author}`] : [];
    }),
  );
  const seenAuthors = new Set<string>();
  const works = new Set<string>();
  return books
    .filter((book) => {
      if (works.has(book.key)) return false;
      works.add(book.key);
      const ids = (completeIsbns.get(book) ?? book.isbn ?? [])
        .map(normalizeIsbn)
        .filter((value): value is string => value !== null);
      if (ids.some((id) => importedIsbns.has(id))) return false;
      const names = (book.author_name ?? []).map(normalizeText).filter(Boolean);
      if (
        names.some((name) =>
          importedTitleAuthors.has(`${normalizeText(book.title)}\u0000${name}`),
        )
      )
        return false;
      const authors = [
        ...(book.author_key ?? [])
          .filter((key) => /^\/authors\/OL\d+A$/.test(key))
          .map((key) => `key:${key}`),
        ...names.map((name) => `name:${name}`),
      ];
      if (!authors.length || authors.some((author) => seenAuthors.has(author)))
        return false;
      authors.forEach((author) => seenAuthors.add(author));
      return true;
    })
    .slice(0, 10);
}

export function candidateBooks(
  books: Book[],
  random: () => number = Math.random,
): Candidate[] {
  const rated = books.flatMap((book, index) => {
    const value = book.my_rating;
    if (value === null || value.trim() === "") return [];
    const rating = Number(value);
    return Number.isFinite(rating) && rating >= 0 && rating <= 5
      ? [{ book, rating, index }]
      : [];
  });
  for (let i = rated.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rated[i], rated[j]] = [rated[j], rated[i]];
  }
  rated.sort((a, b) => b.rating - a.rating);
  const unique = new Set<string>();
  return rated.slice(0, 30).flatMap(({ book }) => {
    const isbn = normalizeIsbn(book.isbn13) ?? normalizeIsbn(book.isbn);
    if (!isbn || unique.has(isbn)) return [];
    unique.add(isbn);
    return [{ isbn, title: (book.title ?? "Untitled").slice(0, 200) }];
  });
}
