import { describe, expect, it, vi } from "vitest";
import { loadSubjectCandidates } from "@/lib/subjects/admin-subject-candidates";

function clientWithBatches(batches: unknown[][], failAt?: number) {
  let call = 0;
  const ranges: number[][] = [];
  const orders: unknown[][] = [];
  const client = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn((...args: unknown[]) => {
          orders.push(args);
          return {
            order: vi.fn((...second: unknown[]) => {
              orders.push(second);
              return {
                range: vi.fn(async (from: number, to: number) => {
                  ranges.push([from, to]);
                  const index = call++;
                  return index === failAt
                    ? { data: null, error: new Error("failed") }
                    : { data: batches[index] ?? [], error: null };
                }),
              };
            }),
          };
        }),
      })),
    })),
  };
  return { client: client as never, ranges, orders };
}

describe("loadSubjectCandidates", () => {
  it("loads all batches with deterministic ordering and exact bigint values", async () => {
    const first = Array.from({ length: 1000 }, (_, index) => ({
      subject: `s${index}`,
      count_text: "9223372036854775807",
    }));
    const second = [{ subject: "tie", count_text: "2" }];
    const { client, ranges, orders } = clientWithBatches([first, second]);
    const data = await loadSubjectCandidates(client);
    expect(data).toHaveLength(1001);
    expect(data[0].count).toBe("9223372036854775807");
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    expect(orders).toEqual([
      ["count", { ascending: false }],
      ["subject", { ascending: true }],
      ["count", { ascending: false }],
      ["subject", { ascending: true }],
    ]);
  });

  it("returns empty data and rejects later-batch failures instead of returning partial rows", async () => {
    const empty = clientWithBatches([[]]);
    await expect(loadSubjectCandidates(empty.client)).resolves.toEqual([]);
    const later = clientWithBatches(
      [
        Array.from({ length: 1000 }, (_, i) => ({
          subject: `${i}`,
          count_text: "1",
        })),
      ],
      1,
    );
    await expect(loadSubjectCandidates(later.client)).rejects.toThrow(
      "Unable to load subject candidates",
    );
  });
});
