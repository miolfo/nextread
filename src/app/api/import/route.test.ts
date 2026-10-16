import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/import/route";

it("logs the uploaded filename and returns the mock import id", async () => {
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
  const response = await POST({
    formData: async () => new FormData(),
  } as Request);
  expect(response.status).toBe(400);
});
