import { describe, expect, it, vi } from "vitest";
import { loadSubjectCandidates } from "@/lib/subjects/admin-subject-candidates";

function mockClient(rows: unknown[], total = 41, error: Error | null = null) {
  const ranges: number[][] = [];
  const orders: unknown[][] = [];
  const select = vi
    .fn()
    .mockImplementation((_columns: string, options?: unknown) => {
      if (options) return Promise.resolve({ count: total, error });
      const query = {
        order: vi.fn((...args: unknown[]) => {
          orders.push(args);
          return query;
        }),
        range: vi.fn(async (from: number, to: number) => {
          ranges.push([from, to]);
          return { data: rows, error };
        }),
      };
      return query;
    });
  const client = { from: vi.fn(() => ({ select })) };
  return { client: client as never, ranges, orders };
}

describe("loadSubjectCandidates", () => {
  it("queries exact counts and only requested ranges with numeric ordering and stable ties", async () => {
    const { client, ranges, orders } = mockClient([
      { subject: "same", count_text: "9223372036854775807" },
    ]);
    const result = await loadSubjectCandidates(
      client,
      2,
      "occurrences",
      "desc",
    );
    expect(result).toEqual({
      candidates: [{ subject: "same", count: "9223372036854775807" }],
      total: 41,
      page: 2,
    });
    expect(ranges).toEqual([[20, 39]]);
    expect(orders).toEqual([
      ["count", { ascending: false }],
      ["subject", { ascending: true }],
    ]);
  });

  it("supports candidate order and propagates count or row errors", async () => {
    const { client, orders } = mockClient([]);
    await loadSubjectCandidates(client, 1, "candidate", "desc");
    expect(orders).toEqual([["subject", { ascending: false }]]);
    const failed = mockClient([], 0, new Error("failure"));
    await expect(
      loadSubjectCandidates(failed.client, 1, "occurrences", "desc"),
    ).rejects.toThrow("Unable to count");
  });

  it("does not range an unsafe out-of-range page and normalizes an empty dataset", async () => {
    const outside = mockClient([], 41);
    await expect(
      loadSubjectCandidates(
        outside.client,
        Number.MAX_SAFE_INTEGER,
        "candidate",
        "desc",
      ),
    ).resolves.toEqual({
      candidates: [],
      total: 41,
      page: Number.MAX_SAFE_INTEGER,
    });
    expect(outside.ranges).toEqual([]);
    const empty = mockClient([], 0);
    await expect(
      loadSubjectCandidates(empty.client, 99, "occurrences", "desc"),
    ).resolves.toEqual({ candidates: [], total: 0, page: 1 });
    expect(empty.ranges).toEqual([]);
  });

  it("treats a missing exact count as unavailable", async () => {
    const client = {
      from: () => ({
        select: () => Promise.resolve({ count: undefined, error: null }),
      }),
    } as never;
    await expect(
      loadSubjectCandidates(client, 1, "occurrences", "desc"),
    ).rejects.toThrow("Unable to count subject candidates");
  });
});
