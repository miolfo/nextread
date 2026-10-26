import { describe, expect, it, vi } from "vitest";
import {
  aggregateSubjectCandidates,
  persistSubjectCandidates,
} from "@/lib/subjects/subject-candidates";

describe("subject candidates", () => {
  it("counts each exact subject once per book and orders deterministically", () => {
    expect(
      aggregateSubjectCandidates([
        { title: "a", subjects: ["Zebra", "Fantasy", "Fantasy"] },
        { title: "b", subjects: ["Zebra", "Alpha"] },
      ]),
    ).toEqual([
      { name: "Zebra", count: 2 },
      { name: "Alpha", count: 1 },
      { name: "Fantasy", count: 1 },
    ]);
  });

  it("persists through the restricted RPC and skips empty observations", async () => {
    const rpc = vi.fn().mockReturnValue({
      abortSignal: () => Promise.resolve({ error: null }),
    });
    const client = { rpc } as never;
    const deadline = Date.now() + 1_000;
    await persistSubjectCandidates([], client, deadline);
    expect(rpc).not.toHaveBeenCalled();
    await persistSubjectCandidates(
      [{ title: "book", subjects: ["Fantasy"] }],
      client,
      deadline,
    );
    expect(rpc).toHaveBeenCalledWith("record_subject_candidates", {
      p_candidates: [{ subject: "Fantasy", count: 1 }],
    });
  });

  it("retains the Supabase error as cause and its safe code", async () => {
    const databaseError = {
      code: "42803",
      message: "unsafe row payload",
      details: "sensitive details",
    };
    const rpc = vi.fn().mockReturnValue({
      abortSignal: () => Promise.resolve({ error: databaseError }),
    });
    await expect(
      persistSubjectCandidates(
        [{ title: "book", subjects: ["Fantasy"] }],
        { rpc } as never,
        Date.now() + 1_000,
      ),
    ).rejects.toMatchObject({ code: "42803", cause: databaseError });
  });

  it("assigns a stable safe code when persistence times out", async () => {
    vi.useFakeTimers();
    const rpc = vi.fn().mockReturnValue({
      abortSignal: () => new Promise(() => {}),
    });
    const result = persistSubjectCandidates(
      [{ title: "book", subjects: ["Fantasy"] }],
      { rpc } as never,
      Date.now() + 10,
    );
    const assertion = expect(result).rejects.toMatchObject({
      code: "SUBJECT_PERSISTENCE_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(10);
    await assertion;
    vi.useRealTimers();
  });
});
