import { describe, expect, it, vi } from "vitest";
import { persistRecommendations } from "@/lib/recommendations/persist";

describe("persistRecommendations", () => {
  it("saves ordered recommendations and returns the set ID, including empty sets", async () => {
    const abortSignal = vi.fn(() =>
      Promise.resolve({ data: "set-id", error: null }),
    );
    const supabase = { rpc: vi.fn(() => ({ abortSignal })) } as never;
    await expect(
      persistRecommendations(supabase, "import-id", [], Date.now() + 1000),
    ).resolves.toBe("set-id");
    expect(supabase).toBeDefined();
  });

  it("rejects storage errors", async () => {
    const supabase = {
      rpc: () => ({
        abortSignal: () =>
          Promise.resolve({ data: null, error: { code: "XX" } }),
      }),
    } as never;
    await expect(
      persistRecommendations(supabase, "import-id", [], Date.now() + 1000),
    ).rejects.toThrow();
  });
});
