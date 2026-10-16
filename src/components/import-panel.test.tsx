import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { ImportPanel } from "@/components/import-panel";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

beforeEach(() => {
  replace.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ importId: "123" }),
    }),
  );
});

it("submits a selected file as multipart data and updates the import URL", async () => {
  const user = userEvent.setup();
  render(<ImportPanel />);
  const file = new File(["arbitrary content"], "books.txt", {
    type: "text/plain",
  });
  const input = screen.getByLabelText("Choose a file");
  expect(input).toHaveAttribute("hidden");
  expect(input).toHaveAttribute("type", "file");
  expect(screen.getByRole("button", { name: "Choose file" })).toBeVisible();
  fireEvent.change(input, { target: { files: [file] } });
  expect(screen.getByText("books.txt")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Import file" }));

  await waitFor(() =>
    expect(replace).toHaveBeenCalledWith("/app/import?importId=123"),
  );
  expect(fetch).toHaveBeenCalledWith(
    "/api/import",
    expect.objectContaining({ method: "POST" }),
  );
  const [, request] = vi.mocked(fetch).mock.calls[0];
  expect(request?.body).toBeInstanceOf(FormData);
  expect((request?.body as FormData).get("file")).toBe(file);
});
