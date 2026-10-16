import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendationControls } from "@/components/recommendation-controls";

describe("Recommendation controls", () => {
  it("starts with defaults, supports local edits, and resets on remount", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecommendationControls />);
    expect(screen.getAllByText("10")).toHaveLength(2);
    expect(screen.getByLabelText("Focus (optional)")).toHaveTextContent(
      "No specific focus",
    );
    expect(screen.getByRole("switch")).toBeChecked();
    expect(
      screen.queryByRole("button", { name: /Remove/ }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Your request"), "A new adventure");
    await user.click(screen.getByRole("switch"));
    expect(screen.getByLabelText("Your request")).toHaveValue(
      "A new adventure",
    );
    expect(screen.getByRole("switch")).not.toBeChecked();
    await user.click(screen.getAllByLabelText("Number of recommendations")[0]);
    await user.click(await screen.findByRole("option", { name: "20" }));
    expect(
      screen.getAllByLabelText("Number of recommendations")[0],
    ).toHaveTextContent("20");
    expect(
      screen.getAllByLabelText("Number of recommendations")[1],
    ).toHaveTextContent("10");
    await user.click(screen.getByLabelText("Focus (optional)"));
    await user.click(
      await screen.findByRole("option", { name: "Discover new authors" }),
    );
    expect(screen.getByLabelText("Focus (optional)")).toHaveTextContent(
      "Discover new authors",
    );
    unmount();
    render(<RecommendationControls />);
    expect(screen.getByLabelText("Your request")).toHaveValue("");
    expect(screen.getAllByText("10")).toHaveLength(2);
    expect(screen.getByRole("switch")).toBeChecked();
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
    await user.click(screen.getByLabelText("Include genres"));
    await user.click(await screen.findByRole("option", { name: "Fantasy" }));
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("button", {
        name: "Remove Fantasy from exclude genres",
      }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Remove Fantasy from include genres",
      }),
    );
    expect(
      screen.queryByRole("button", { name: /Remove Fantasy/ }),
    ).not.toBeInTheDocument();
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

  it("keeps action buttons enabled, non-submit, and inert", async () => {
    const user = userEvent.setup();
    const { container } = render(<RecommendationControls />);
    const before = container.innerHTML;
    for (const name of ["Get AI Recommendations", "Generate Recommendations"]) {
      const button = screen.getByRole("button", { name });
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("type", "button");
      await user.click(button);
    }
    expect(container.innerHTML).toBe(before);
  });
});
