import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}));
import { requireAdminUser } from "@/lib/supabase/auth";

describe("requireAdminUser", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mocks.notFound.mockImplementation(() => {
      throw new Error("notFound");
    });
  });
  const client = (user: unknown, error: unknown = null) =>
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error }) },
    });

  it("redirects signed-out users to login with encoded admin return destination", async () => {
    client(null);
    await expect(requireAdminUser("/app/admin/subjects")).rejects.toThrow(
      "redirect:/app/login?next=%2Fapp%2Fadmin%2Fsubjects",
    );
  });
  it.each([
    { app_metadata: {} },
    { app_metadata: { is_admin: "true" } },
    { user_metadata: { is_admin: true } },
    { app_metadata: null },
  ])("rejects untrusted or malformed claims %#", async (claims) => {
    client({ id: "u", ...claims });
    await expect(requireAdminUser("/app/admin/subjects")).rejects.toThrow(
      "notFound",
    );
  });
  it("allows only strict trusted boolean true", async () => {
    const user = { id: "admin", app_metadata: { is_admin: true } };
    client(user);
    await expect(requireAdminUser("/app/admin/subjects")).resolves.toBe(user);
  });
  it("treats auth errors without a verified user as signed out", async () => {
    client(null, new Error("auth error"));
    await expect(requireAdminUser("/app/admin/subjects")).rejects.toThrow(
      "redirect:",
    );
  });
});
