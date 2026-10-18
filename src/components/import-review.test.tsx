import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ImportReview, type ReviewBook } from "@/components/import-review";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const books: ReviewBook[] = [
  {
    id: "1",
    title: "Older",
    author: "Author A",
    my_rating: "5",
    date_read: "01/02/2024",
  },
  {
    id: "2",
    title: "Newest",
    author: "Author A",
    my_rating: "4",
    date_read: "12/31/2024",
  },
  {
    id: "3",
    title: "No date",
    author: "Author B",
    my_rating: "0",
    date_read: "",
  },
  {
    id: "4",
    title: null,
    author: null,
    my_rating: null,
    date_read: "01/03/2025",
  },
  {
    id: "5",
    title: "Goodreads date format",
    author: "Author C",
    my_rating: "3",
    date_read: "2025/10/12",
  },
];

it("summarizes saved records and lists valid latest reads", () => {
  render(<ImportReview books={books} />);
  expect(
    screen.getByRole("heading", { name: "Import review" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Total books")).toBeInTheDocument();
  expect(screen.getByText("Rated books")).toBeInTheDocument();
  expect(screen.getByText("Unique authors")).toBeInTheDocument();
  expect(screen.getByText("Newest")).toBeInTheDocument();
  expect(screen.getByText("Goodreads date format")).toBeInTheDocument();
  expect(screen.getByText("Older")).toBeInTheDocument();
  expect(screen.queryByText("No date")).not.toBeInTheDocument();
  expect(screen.getByText("Title unavailable")).toBeInTheDocument();
  expect(screen.queryByText("Top genres")).not.toBeInTheDocument();
});

it("floors valid whole- and half-star ratings and leaves invalid values unrated", () => {
  const ratedBooks: ReviewBook[] = [
    {
      id: "5",
      title: "Five",
      author: null,
      my_rating: "5.0",
      date_read: null,
    },
    {
      id: "4",
      title: "Four",
      author: null,
      my_rating: "4.0",
      date_read: "2025-04-04",
    },
    {
      id: "3",
      title: "Three",
      author: null,
      my_rating: "3.0",
      date_read: "2025-03-03",
    },
    {
      id: "fraction",
      title: "Four and a half",
      author: null,
      my_rating: "4.5",
      date_read: "2025-02-02",
    },
    {
      id: "three-and-a-half",
      title: "Three and a half",
      author: null,
      my_rating: "3.5",
      date_read: "2025-02-01",
    },
    {
      id: "one-and-a-half",
      title: "One and a half",
      author: null,
      my_rating: "1.5",
      date_read: "2025-06-01",
    },
    {
      id: "empty",
      title: "Empty",
      author: null,
      my_rating: "",
      date_read: null,
    },
    {
      id: "zero",
      title: "Zero",
      author: null,
      my_rating: "0",
      date_read: null,
    },
    {
      id: "six",
      title: "Six",
      author: null,
      my_rating: "6.0",
      date_read: null,
    },
    {
      id: "below-range",
      title: "Below range",
      author: null,
      my_rating: "0.5",
      date_read: null,
    },
    {
      id: "above-range",
      title: "Above range",
      author: null,
      my_rating: "5.5",
      date_read: null,
    },
    {
      id: "invalid",
      title: "Invalid",
      author: null,
      my_rating: "rating",
      date_read: "2025-01-01",
    },
    {
      id: "null",
      title: "Null",
      author: null,
      my_rating: null,
      date_read: null,
    },
  ];

  render(<ImportReview books={ratedBooks} />);

  expect(screen.getByText("6", { selector: "p" })).toBeInTheDocument();
  expect(screen.getAllByText("1 (17%)")).toHaveLength(2);
  expect(screen.getAllByText("2 (33%)")).toHaveLength(2);
  expect(screen.getByText("0 (0%)")).toBeInTheDocument();
  expect(screen.getAllByText("4 out of 5 stars")).toHaveLength(2);
  expect(screen.getAllByText("3 out of 5 stars")).toHaveLength(2);
  expect(screen.getByText("1 out of 5 stars")).toBeInTheDocument();
  expect(screen.queryByText("4.5 out of 5 stars")).not.toBeInTheDocument();
  const percentages = screen
    .getAllByText(/\(\d+%\)/)
    .map((element) => Number(element.textContent?.match(/\((\d+)%\)/)?.[1]));
  expect(percentages.reduce((sum, percentage) => sum + percentage, 0)).toBe(
    100,
  );
});

it("shows empty values and unavailable errors without fabricated records", () => {
  const { rerender } = render(<ImportReview books={[]} />);
  expect(screen.getAllByText("0", { selector: "p" })).toHaveLength(3);
  expect(screen.getByText("No rated books.")).toBeInTheDocument();
  expect(
    screen.getByText("No books with a valid read date."),
  ).toBeInTheDocument();
  rerender(<ImportReview books={[]} unavailable />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Import data is currently unavailable",
  );
});

it("supports both next-step actions", async () => {
  const user = userEvent.setup();
  render(<ImportReview books={[]} />);
  await user.click(
    screen.getByRole("button", { name: "Import a different file" }),
  );
  expect(replace).toHaveBeenCalledWith("/app/import");
  expect(
    screen.getByRole("link", { name: "Continue to recommendations" }),
  ).toHaveAttribute("href", "/app/recommendations");
});
