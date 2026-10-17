import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/import/route";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

it("logs the uploaded filename and returns the mock import id", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const form = new FormData();
  form.append(
    "file",
    new Blob(["arbitrary"], { type: "text/plain" }),
    "not-a-csv.txt",
  );
  const response = await POST({ formData: async () => form } as Request);

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ importId: "123" });
  expect(info).toHaveBeenCalledWith("Received import file: not-a-csv.txt");
  info.mockRestore();
});

it("rejects requests without a file", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  const response = await POST({
    formData: async () => new FormData(),
  } as Request);
  expect(response.status).toBe(400);
});

it("returns 401 before reading or logging an unauthenticated upload", async () => {
  getUser.mockResolvedValue({ data: { user: null } });
  const formData = vi.fn();
  const info = vi.spyOn(console, "info").mockImplementation(() => {});
  const response = await POST({ formData } as unknown as Request);
  expect(response.status).toBe(401);
  expect(await response.json()).toEqual({ error: "Unauthorized" });
  expect(formData).not.toHaveBeenCalled();
  expect(info).not.toHaveBeenCalled();
  info.mockRestore();
});
