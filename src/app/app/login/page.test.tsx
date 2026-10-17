import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import LoginPage from "@/app/app/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

it("renders the login route without requiring an authenticated session", async () => {
  const page = await LoginPage({ searchParams: Promise.resolve({}) });
  render(page);

  expect(
    screen.getByRole("heading", { name: "Welcome to your next chapter" }),
  ).toBeInTheDocument();
});
