import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendationControls } from "@/components/recommendation-controls";

const imports = [
  {
    id: "new",
    original_filename: "library.csv",
    created_at: "2026-10-14T10:24:00.000Z",
  },
  {
    id: "old",
    original_filename: "older.csv",
    created_at: "2025-01-03T14:12:00.000Z",
  },
];

describe("Recommendation controls", () => {
  it("shows import metadata and keeps prompt, count, focus, and selection local", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecommendationControls imports={imports} />);
    expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", "500");
    expect(screen.getByText("0/500")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate recommendations" }),
    ).toHaveAttribute("type", "button");
    await user.type(screen.getByRole("textbox"), "A new adventure");
    expect(screen.getByText("15/500")).toBeInTheDocument();
    await user.click(screen.getByLabelText("Number of recommendations"));
    await user.click(await screen.findByRole("option", { name: "20" }));
    expect(
      screen.getByLabelText("Number of recommendations"),
    ).toHaveTextContent("20");
    await user.click(screen.getByRole("combobox", { name: "Import to use" }));
    expect(
      await screen.findByRole("option", { name: /library.csv/ }),
    ).toHaveTextContent("Oct 14, 2026");
    await user.click(screen.getByRole("option", { name: /library.csv/ }));
    expect(
      screen.getByRole("combobox", { name: "Import to use" }),
    ).toHaveTextContent("library.csv");
    unmount();
    render(<RecommendationControls imports={imports} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(
      screen.getByLabelText("Number of recommendations"),
    ).toHaveTextContent("10");
  });

  it("handles empty imports and metadata query errors without fake options", () => {
    const { rerender } = render(<RecommendationControls />);
    expect(screen.getByText(/No imports available/)).toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    rerender(<RecommendationControls importError />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t be loaded/);
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("moves genres between include/exclude and supports removal", async () => {
    const user = userEvent.setup();
    render(<RecommendationControls />);
    await user.click(screen.getByLabelText("Include genres"));
    await user.click(await screen.findByRole("option", { name: "Fantasy" }));
    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("button", {
        name: "Remove Fantasy from include genres",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByLabelText("Exclude genres"));
    await user.click(await screen.findByRole("option", { name: "Fantasy" }));
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", {
        name: "Remove Fantasy from include genres",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Remove Fantasy from exclude genres",
      }),
    ).toBeInTheDocument();
  });

  it.each(["Include genres", "Exclude genres"])(
    "%s exposes checked membership independently of keyboard highlight",
    async (label) => {
      const user = userEvent.setup();
      render(<RecommendationControls />);
      await user.click(screen.getByLabelText(label));
      await screen.findByRole("option", {
        name: "Science Fiction",
        selected: true,
      });
      await user.keyboard("{ArrowDown}{Enter}");
      const fantasy = screen.getByRole("option", { name: "Fantasy" });
      expect(fantasy).toHaveAttribute("aria-checked", "true");

      await user.keyboard("{ArrowDown}");
      expect(fantasy).toHaveAttribute("aria-selected", "false");
      expect(fantasy).toHaveAttribute("aria-checked", "true");
      const mystery = screen.getByRole("option", { name: "Mystery" });
      expect(mystery).toHaveAttribute("aria-selected", "true");
      expect(mystery).toHaveAttribute("aria-checked", "false");

      await user.keyboard("{ArrowUp}{Enter}");
      expect(fantasy).toHaveAttribute("aria-checked", "false");
    },
  );

  it("keeps the action enabled, non-submit, and inert", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecommendationControls />);
    const before = container.innerHTML;
    const button = screen.getByRole("button", {
      name: "Generate recommendations",
    });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(container.innerHTML).toBe(before);
  });
});
