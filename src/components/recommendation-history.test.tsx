import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { RecommendationHistory } from "@/components/recommendation-history";

it("renders saved generations newest first with direct links", () => {
  render(
    <RecommendationHistory
      recommendations={[
        {
          id: "new",
          created_at: "2026-10-14T10:24:00.000Z",
          original_filename: "library.csv",
        },
        {
          id: "old",
          created_at: "2025-01-03T14:12:00.000Z",
          original_filename: null,
        },
      ]}
    />,
  );
  const rows = within(screen.getByRole("table")).getAllByRole("row");
  expect(
    within(rows[0])
      .getAllByRole("columnheader")
      .map((cell) => cell.textContent),
  ).toEqual(["File name", "Date", "Action"]);
  for (const header of within(rows[0])
    .getAllByRole("columnheader")
    .slice(0, -1)) {
    expect(header).not.toHaveClass("text-right");
  }
  expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent(
    "library.csv",
  );
  expect(within(rows[2]).getByRole("rowheader")).toHaveTextContent(
    "Filename unavailable",
  );
  expect(
    within(rows[0]).getByRole("columnheader", { name: "Action" }),
  ).toHaveClass("text-right");
  expect(
    within(rows[1]).getByRole("cell", { name: "View details" }),
  ).toHaveClass("text-right");
  expect(within(rows[1]).getByText(/Oct 14, 2026/)).toBeInTheDocument();
  expect(
    within(rows[1]).getByRole("link", { name: "View details" }),
  ).toHaveAttribute("href", "/app/recommendations?recommendationId=new");
  expect(
    within(rows[2]).getByRole("link", { name: "View details" }),
  ).toHaveAttribute("href", "/app/recommendations?recommendationId=old");
});

it("distinguishes empty and failed recommendation history", () => {
  const { rerender } = render(<RecommendationHistory />);
  expect(screen.getByText("No recommendation history yet")).toBeInTheDocument();
  rerender(<RecommendationHistory error />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "couldn’t load your recommendation history",
  );
  expect(
    screen.queryByText("No recommendation history yet"),
  ).not.toBeInTheDocument();
});
