import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendationResults } from "@/components/recommendation-results";

const result = {
  state: "loaded" as const,
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
      screen.getByRole("heading", { name: "Saved book 1" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Saved book 1" })).toHaveAttribute(
      "href",
      "https://openlibrary.org/works/OL1W",
    );
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

  it.each([
    [
      { state: "invalid" as const },
      "These saved recommendations are unavailable.",
    ],
    [
      { state: "empty" as const },
      "This recommendation run has no saved books.",
    ],
    [
      { state: "error" as const },
      "Saved recommendations couldn’t be loaded. Try again later.",
    ],
  ])("shows the appropriate state without book links", (load, message) => {
    render(<RecommendationResults result={load} />);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Saved book/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Show recommendations/ }),
    ).not.toBeInTheDocument();
  });
});
