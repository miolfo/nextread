import { afterEach, describe, expect, it, vi } from "vitest";
import { searchBySubjects, SearchFailure } from "@/lib/open-library/search-api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("searchBySubjects", () => {
  it.each([
    ["relevance", undefined, undefined],
    ["rating", "rating", "[10 TO *]"],
    ["random", "random", undefined],
  ] as const)("builds the %s query", async (mode, expectedSort, ratings) => {
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ docs: [] })));
    await searchBySubjects(["Fantasy"], Date.now() + 20_000, mode);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get("sort")).toBe(expectedSort ?? null);
    expect(url.searchParams.get("ratings_count")).toBe(ratings ?? null);
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("allows a search to succeed after the former ten-second limit", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () => resolve(new Response(JSON.stringify({ docs: [] }))),
            15_000,
          );
        }),
    );
    const pending = searchBySubjects(["Fantasy"], Date.now() + 40_000);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(pending).resolves.toEqual([]);
  });

  it("times out stalled fetch and body reads even when abort is ignored", async () => {
    vi.useFakeTimers();
    const fetcher = vi.spyOn(globalThis, "fetch");
    fetcher.mockImplementationOnce(() => new Promise(() => {}));
    const pendingFetch = searchBySubjects(["Fantasy"], Date.now() + 40_000);
    const fetchRejected = expect(pendingFetch).rejects.toMatchObject({
      reason: "timeout",
      elapsedMs: 30_000,
      remainingBudgetMs: 30_000,
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await fetchRejected;

    fetcher.mockResolvedValueOnce(
      new Response(new ReadableStream({ pull() {} })),
    );
    const pendingBody = searchBySubjects(["Fantasy"], Date.now() + 40_000);
    const bodyRejected = expect(pendingBody).rejects.toMatchObject({
      reason: "timeout",
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await bodyRejected;
  });

  it("logs the exact built request URL before fetch only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ docs: [] })),
    );
    const expectedUrl =
      "https://openlibrary.org/search.json?q=%28subject_key%3A%22fantasy%22+OR+subject_key%3A%22science_fiction%22%29+AND+language%3Aeng&limit=10&fields=key%2Ctitle%2Cauthor_name%2Cfirst_publish_year%2Cisbn%2Ccover_i";

    await searchBySubjects(["Fantasy", "Science Fiction"], Date.now() + 20_000);

    expect(log).toHaveBeenCalledWith(
      "Open Library search request URL",
      expectedUrl,
    );
  });

  it.each(["test", "production"])(
    "does not log the full URL in %s",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment);
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ docs: [] })),
      );

      await searchBySubjects(["private subject"], Date.now() + 20_000);

      expect(log.mock.calls.flat().join(" ")).not.toContain("search.json");
      expect(log).not.toHaveBeenCalled();
    },
  );

  it("logs the URL before a stalled request times out and ignores diagnostic failures", async () => {
    vi.useFakeTimers();
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {
      throw new Error("console unavailable");
    });
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise(() => {}));
    const pending = searchBySubjects(["Fantasy"], Date.now() + 40_000);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledWith(
      "Open Library search request URL",
      expect.stringContaining("search.json"),
    );
    expect(log.mock.invocationCallOrder[0]).toBeLessThan(
      fetcher.mock.invocationCallOrder[0],
    );
    const rejected = expect(pending).rejects.toMatchObject({
      reason: "timeout",
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await rejected;
  });

  it.each([
    [429, "http-error", 429],
    [503, "http-error", 503],
  ])(
    "classifies HTTP %s without exposing response data",
    async (status, reason, upstreamStatus) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("private upstream body", { status }),
      );
      await expect(
        searchBySubjects(["Fantasy"], Date.now() + 20_000),
      ).rejects.toMatchObject({
        reason,
        upstreamStatus,
      });
    },
  );

  it.each([
    ["not-json", "invalid-json"],
    ["[]", "invalid-shape"],
    ['{"docs":null}', "invalid-shape"],
  ])("rejects invalid response payload %s", async (body, reason) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body));
    await expect(
      searchBySubjects(["Fantasy"], Date.now() + 20_000),
    ).rejects.toMatchObject({ reason });
  });

  it("rejects oversized response and expired overall deadline before fetching", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    fetcher.mockResolvedValue(
      new Response(new Uint8Array(2 * 1024 * 1024 + 1)),
    );
    await expect(
      searchBySubjects(["Fantasy"], Date.now() + 20_000),
    ).rejects.toMatchObject({ reason: "response-too-large" });
    await expect(
      searchBySubjects(["Fantasy"], Date.now()),
    ).rejects.toMatchObject({ reason: "deadline-exhausted" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("caps search to the remaining overall budget after earlier phases", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() => new Promise(() => {}));
    const pending = searchBySubjects(["Fantasy"], Date.now() + 3_000);
    const rejected = expect(pending).rejects.toMatchObject({
      reason: "timeout",
      remainingBudgetMs: 3_000,
      elapsedMs: 3_000,
    });
    await vi.advanceTimersByTimeAsync(3_000);
    await rejected;
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("keeps failure details to the safe classification contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("private", { status: 503 }),
    );
    try {
      await searchBySubjects(["private subject"], Date.now() + 20_000);
    } catch (error) {
      expect(error).toBeInstanceOf(SearchFailure);
      expect(Object.keys(error as object).sort()).toEqual([
        "elapsedMs",
        "reason",
        "remainingBudgetMs",
        "upstreamStatus",
      ]);
      expect(JSON.stringify(error)).not.toContain("private");
    }
  });
});
