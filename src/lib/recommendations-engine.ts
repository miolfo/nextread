export type Book = {
  title: string | null;
  isbn: string | null;
  isbn13: string | null;
  my_rating: string | null;
};
export type Candidate = { title: string; isbn: string };

function normalizeIsbn(value: string | null): string | null {
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
