import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
  it("shows import metadata and keeps count, focus, and selection local", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecommendationControls imports={imports} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/\/500/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate recommendations" }),
    ).toHaveAttribute("type", "button");
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

  it("requires an import, submits the selected ID, and prevents overlapping requests", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve(new Response(JSON.stringify({ ok: true })));
        }),
    );
    render(<RecommendationControls imports={imports} />);
    const button = screen.getByRole("button", {
      name: "Generate recommendations",
    });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "button");
    await user.click(screen.getByRole("combobox", { name: "Import to use" }));
    await user.click(
      await screen.findByRole("option", { name: /library.csv/ }),
    );
    expect(button).toBeEnabled();
    await user.click(button);
    expect(button).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/recommendations",
      expect.objectContaining({ body: JSON.stringify({ importId: "new" }) }),
    );
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledOnce();
    finish();
    await screen.findByRole("button", { name: "Generate recommendations" });
    fetchMock.mockRestore();
  });
});
