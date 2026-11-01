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
  it("shows import metadata and keeps count, sort, and selection local", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<RecommendationControls imports={imports} />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/\/500/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate recommendations" }),
    ).toHaveAttribute("type", "button");
    expect(screen.getByLabelText("Number of recommendations")).toBeDisabled();
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

  it("disables count and genre controls and explains their status", () => {
    render(<RecommendationControls />);
    expect(screen.getByLabelText("Number of recommendations")).toBeDisabled();
    expect(
      screen.getAllByText(/Genre filtering is not yet applied/),
    ).toHaveLength(2);
    expect(screen.getByLabelText("Include genres")).toBeDisabled();
    expect(screen.getByLabelText("Exclude genres")).toBeDisabled();
  });

  it("submits the selected sort option", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    render(<RecommendationControls imports={imports} />);
    await user.click(screen.getByRole("combobox", { name: "Sorted by" }));
    await user.click(
      await screen.findByRole("option", { name: "Highest rated" }),
    );
    expect(
      screen.getByRole("combobox", { name: "Sorted by" }),
    ).toHaveTextContent("Highest rated");
    await user.click(screen.getByRole("combobox", { name: "Import to use" }));
    await user.click(
      await screen.findByRole("option", { name: /library.csv/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Generate recommendations" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/recommendations",
      expect.objectContaining({
        body: JSON.stringify({ importId: "new", sort: "rating" }),
      }),
    );
  });

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
      expect.objectContaining({
        body: JSON.stringify({ importId: "new", sort: "relevance" }),
      }),
    );
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledOnce();
    finish();
    await screen.findByRole("button", { name: "Generate recommendations" });
    fetchMock.mockRestore();
  });
});
