import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ImportPage from "@/app/app/import/page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

it("shows the import step without importId and the review with importId", async () => {
  const importStep = await ImportPage({ searchParams: Promise.resolve({}) });
  const { rerender } = render(importStep);
  expect(
    screen.getByRole("heading", { name: "Import your Goodreads data" }),
  ).toBeInTheDocument();

  const reviewStep = await ImportPage({
    searchParams: Promise.resolve({ importId: "123" }),
  });
  rerender(reviewStep);
  expect(
    screen.getByRole("heading", { name: "Illustrative import review" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "Import your Goodreads data" }),
  ).not.toBeInTheDocument();
});
