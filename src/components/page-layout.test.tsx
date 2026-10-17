import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PageLayout } from "@/components/page-layout";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

it("does not render sign out on the public splash page", () => {
  usePathname.mockReturnValue("/");

  render(<PageLayout>Public content</PageLayout>);

  expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
});

it("renders sign out in app navigation", () => {
  usePathname.mockReturnValue("/app/import");

  render(<PageLayout>App content</PageLayout>);

  const navigationItems = screen
    .getByRole("navigation", { name: "Main navigation" })
    .querySelectorAll("a, button");

  expect(Array.from(navigationItems).map((item) => item.textContent)).toEqual([
    "Import",
    "Import history",
    "Recommendations",
    "Sign out",
  ]);
  expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass(
    "hover:bg-muted",
  );
});
