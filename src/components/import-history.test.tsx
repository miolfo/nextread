import { render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import ImportsPage from "@/app/app/(protected)/imports/page";

vi.mock("@/lib/supabase/auth", () => ({
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/imports",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

it("renders static import history and links each record to its review", async () => {
  render(await ImportsPage());

  expect(
    screen.getByRole("heading", { name: "Imported files" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Import another Goodreads file" }),
  ).toHaveAttribute("href", "/app/import");
  expect(screen.getByRole("link", { name: "Import history" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getAllByRole("row")).toHaveLength(5);
  expect(screen.getByText("472")).toBeInTheDocument();
  expect(screen.getByText("287")).toBeInTheDocument();

  const table = screen.getByRole("table");
  const links = within(table).getAllByRole("link", { name: "View details" });
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "/app/import?importId=goodreads-2025",
    "/app/import?importId=goodreads-2024",
    "/app/import?importId=goodreads-2023",
    "/app/import?importId=goodreads-2022",
  ]);
});
