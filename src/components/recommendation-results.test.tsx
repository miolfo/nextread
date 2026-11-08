import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendationResults } from "@/components/recommendation-results";

const result = {
  state: "loaded" as const,
  metadata: {
    importFilename: "books.csv",
    filters: {
      sort: "relevance",
      included_genres: ["Fantasy"],
      excluded_genres: [],
      from_year: 1990,
      to_year: 2024,
      lengths: ["short"],
    },
    subjectsUsed: ["Raw Open Library Subject"],
  },
  books: Array.from({ length: 12 }, (_, index) => ({
    key: `/works/OL${index + 1}W`,
    title: `Saved book ${index + 1}`,
    author_name: null,
    first_publish_year: null,
  })),
};

describe("Recommendation results", () => {
  it("shows saved results and pages through them accessibly", async () => {
    const user = userEvent.setup();
    render(<RecommendationResults result={result} />);
    expect(
      screen.getByRole("heading", { name: "Your book recommendations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Applied filters" }),
    ).toHaveTextContent("Raw Open Library Subject");
    expect(
      screen.getByRole("region", { name: "Applied filters" }),
    ).toHaveTextContent("books.csv");
    expect(
      screen.getByRole("heading", { name: "Saved book 1" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    expect(screen.getByText("5–8 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Saved book 5" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Previous recommendations" }),
    );
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Saved book 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous recommendations" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    expect(
      screen.getByRole("button", { name: "Next recommendations" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Show recommendations 3" }),
    );
    expect(screen.getByText("9–12 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate again" }),
    ).toHaveAttribute("href", "/app/recommendations");
  });

  it("supports moving backward with the mobile controls", async () => {
    const user = userEvent.setup();
    render(<RecommendationResults result={result} />);
    await user.click(screen.getByRole("button", { name: /^Next$/ }));
    expect(screen.getByText("5–8 of 12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("shows applied metadata for empty runs and explains legacy metadata gaps", () => {
    const empty = {
      state: "empty" as const,
      books: [],
      metadata: result.metadata,
    };
    const { rerender } = render(<RecommendationResults result={empty} />);
    expect(
      screen.getByRole("region", { name: "Applied filters" }),
    ).toHaveTextContent("Raw Open Library Subject");
    expect(
      screen.getByText("This recommendation run has no saved books."),
    ).toBeInTheDocument();

    rerender(<RecommendationResults result={{ ...empty, metadata: null }} />);
    expect(
      screen.getByText(/unavailable for this legacy recommendation run/),
    ).toBeInTheDocument();
  });
});
