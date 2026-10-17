import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { LoginForm } from "@/components/login-form";

const signInWithPassword = vi.fn();
const replace = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithPassword } }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: vi.fn() }),
}));

it("shows sign-in-only fields and no account-creation option", () => {
  render(<LoginForm nextPath="/app/import" />);
  expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByText(/create an account/i)).not.toBeInTheDocument();
});

it("shows a sign-in error from Supabase", async () => {
  signInWithPassword.mockResolvedValue({
    error: new Error("Invalid login credentials"),
  });
  render(<LoginForm nextPath="/app/import" />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "reader@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid login credentials",
  );
  expect(signInWithPassword).toHaveBeenCalledWith({
    email: "reader@example.com",
    password: "password123",
  });
});

it("redirects after successful sign-in", async () => {
  signInWithPassword.mockResolvedValue({ error: null });
  render(<LoginForm nextPath="/app/recommendations" />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "reader@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("button", { name: "Sign in" });
  expect(replace).toHaveBeenCalledWith("/app/recommendations");
});
