import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ImportReview } from "@/components/import-review";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

it("shows the illustrative review and supports both next-step actions", async () => {
  const user = userEvent.setup();
  render(<ImportReview />);
  expect(
    screen.getByRole("heading", { name: "Illustrative import review" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      /illustrative demo only: your uploaded file was not processed/i,
    ),
  ).toBeInTheDocument();
  expect(screen.getByText("237")).toBeInTheDocument();
  expect(screen.getByText("Ratings distribution")).toBeInTheDocument();
  expect(screen.getByText("Top genres")).toBeInTheDocument();
  expect(screen.getByText("Project Hail Mary")).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Import a different file" }),
  );
  expect(replace).toHaveBeenCalledWith("/app/import");
  const continueLink = screen.getByRole("link", {
    name: "Continue to recommendations",
  });
  expect(continueLink).toHaveAttribute("href", "/app/recommendations");
  expect(continueLink).toBeInstanceOf(HTMLAnchorElement);
});
