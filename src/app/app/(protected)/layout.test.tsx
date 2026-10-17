import { expect, it, vi } from "vitest";
import ProtectedLayout from "@/app/app/(protected)/layout";

const { getUser, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

it("redirects unauthenticated visitors from the protected route group", async () => {
  getUser.mockResolvedValue({ data: { user: null } });

  await expect(
    ProtectedLayout({ children: "protected content" }),
  ).rejects.toThrow("redirect:/app/login?next=%2Fapp%2Fimport");
});

it("renders protected children when the user is authenticated", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "reader-1" } } });

  await expect(
    ProtectedLayout({ children: "protected content" }),
  ).resolves.toBe("protected content");
});
