import { afterEach, describe, expect, it, vi } from "vitest";
import { lookupBookSubjects } from "@/lib/open-library/books-api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("lookupBookSubjects cleanup", () => {
  it.each([
    ["HTTP error", 503, new TextEncoder().encode("upstream error")],
    ["oversized response", 200, new Uint8Array(2 * 1024 * 1024 + 1)],
  ])(
    "does not wait for never-settling cancellation on %s",
    async (_, status, chunk) => {
      const cancel = vi.fn(() => new Promise<void>(() => {}));
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(chunk as Uint8Array);
        },
        cancel,
      });
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(body, { status }),
      );
      const log = vi.spyOn(console, "log").mockImplementation(() => {});

      await expect(
        lookupBookSubjects(
          [{ title: "title", isbn: "9780306406157" }],
          Date.now() + 20_000,
        ),
      ).resolves.toEqual([]);
      expect(cancel).toHaveBeenCalledOnce();
      expect(JSON.stringify(log.mock.calls)).toContain(
        status === 503 ? "http-error" : "response-too-large",
      );
    },
  );
});
