import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { ImportPanel } from "@/components/import-panel";

it("shows export instructions and an enabled inert upload button without a file input", async () => {
  const user = userEvent.setup();
  const { container } = render(<ImportPanel />);
  const before = container.innerHTML;
  const button = screen.getByRole("button", { name: "Choose file" });
  expect(button).toBeEnabled();
  expect(button).toHaveAttribute("type", "button");
  await user.click(button);
  expect(container.innerHTML).toBe(before);
  expect(container.querySelector("input")).toBeNull();
  expect(screen.getAllByRole("listitem")).toHaveLength(4);
  expect(screen.getByRole("link")).toHaveAttribute(
    "href",
    "https://www.goodreads.com/review/import",
  );
});
