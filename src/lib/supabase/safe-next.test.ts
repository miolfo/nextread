import { expect, it } from "vitest";
import { safeNextPath } from "@/lib/supabase/safe-next";

it("allows same-site paths and rejects external or malformed destinations", () => {
  expect(safeNextPath("/app/recommendations?mode=random")).toBe(
    "/app/recommendations?mode=random",
  );
  expect(safeNextPath("https://evil.example")).toBe("/app/import");
  expect(safeNextPath("//evil.example")).toBe("/app/import");
  expect(safeNextPath("/\\evil.example")).toBe("/app/import");
});
