import { NextRequest } from "next/server";
import { expect, it, vi } from "vitest";
import { GET } from "@/app/auth/callback/route";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession } }),
}));

it("exchanges the auth code and redirects to a safe requested destination", async () => {
  exchangeCodeForSession.mockResolvedValue({ error: null });
  const request = new NextRequest(
    "https://nextread.example/auth/callback?code=auth-code&next=%2Fapp%2Frecommendations%3Fmode%3Drandom",
  );

  const response = await GET(request);

  expect(exchangeCodeForSession).toHaveBeenCalledWith("auth-code");
  expect(response.headers.get("location")).toBe(
    "https://nextread.example/app/recommendations?mode=random",
  );
});

it("uses the safe fallback and redirects even when the exchange returns an error", async () => {
  exchangeCodeForSession.mockResolvedValue({
    error: new Error("invalid code"),
  });
  const request = new NextRequest(
    "https://nextread.example/auth/callback?code=invalid-code&next=https%3A%2F%2Fevil.example",
  );

  const response = await GET(request);

  expect(exchangeCodeForSession).toHaveBeenCalledWith("invalid-code");
  expect(response.headers.get("location")).toBe(
    "https://nextread.example/app/import",
  );
});
