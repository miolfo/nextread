import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recommendations/route";

const { getUser, from, maybeSingle, abortSignal } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  maybeSingle: vi.fn(),
  abortSignal: vi.fn((signal: AbortSignal) => {
    void signal;
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}));

let ownership: unknown = {
  data: { id: "a0000000-0000-0000-0000-000000000001" },
  error: null,
};
let pages: unknown[] = [{ data: [], error: null }];
let pageIndex: number;
let pendingPage = false;
let pendingOwnership = false;
const importId = "a0000000-0000-0000-0000-000000000001";
const isbn = (n: number) => {
  const body = `9780306406${String(n).padStart(2, "0")}`;
  const sum = [...body].reduce(
    (total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1),
    0,
  );
  return `${body}${(10 - (sum % 10)) % 10}`;
};
function query() {
  let result: Promise<unknown> = Promise.resolve(undefined);
  const q = {
    select: vi.fn(() => q),
    eq: vi.fn(() => q),
    order: vi.fn(() => q),
    range: vi.fn(() => q),
    abortSignal: vi.fn((signal: AbortSignal) => {
      abortSignal(signal);
      return q;
    }),
    maybeSingle,
    then: (
      resolve: (value: unknown) => unknown,
      reject: (reason: unknown) => unknown,
    ) => result.then(resolve, reject),
  };
  q.range.mockImplementation(() => {
    result = pendingPage
      ? new Promise(() => {})
      : Promise.resolve(pages[pageIndex++]);
    return q;
  });
  return q;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  pageIndex = 0;
  pendingPage = false;
  pendingOwnership = false;
  ownership = { data: { id: importId }, error: null };
  pages = [{ data: [], error: null }];
  getUser.mockResolvedValue({ data: { user: { id: "private-user" } } });
  maybeSingle.mockImplementation(() =>
    pendingOwnership ? new Promise(() => {}) : Promise.resolve(ownership),
  );
  from.mockImplementation(() => query());
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
const post = (body: unknown = { importId }) =>
  POST(
    new Request("http://localhost/api/recommendations", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/recommendations", () => {
  it("rejects unauthenticated requests and malformed/missing selections", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await post()).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
    getUser.mockResolvedValue({ data: { user: { id: "x" } } });
    expect((await post({})).status).toBe(400);
    expect((await post({ importId: "invalid" })).status).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("does not read books or call provider for an invisible import", async () => {
    ownership = { data: null, error: null };
    const provider = vi.spyOn(globalThis, "fetch");
    expect((await post()).status).toBe(404);
    expect(from).toHaveBeenCalledOnce();
    expect(provider).not.toHaveBeenCalled();
  });

  it("disables before database/provider access in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await post()).status).toBe(404);
    expect(from).not.toHaveBeenCalled();
  });

  it("reads complete pagination and sends a single capped ISBN batch, logging only safe fields", async () => {
    const records = Array.from({ length: 500 }, (_, i) => ({
      title: `title-${i}`,
      isbn: "",
      isbn13: "",
      my_rating: "1",
    }));
    const lastPage = Array.from({ length: 12 }, (_, i) => ({
      title: `later-${i}`,
      isbn: "",
      isbn13: isbn(i),
      my_rating: "5",
    }));
    pages = [
      { data: records, error: null },
      { data: lastPage, error: null },
    ];
    const provider = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((input) => {
        const url = new URL(String(input));
        const firstKey = url.searchParams.get("bibkeys")!.split(",")[0];
        return Promise.resolve(
          new Response(
            JSON.stringify({
              [firstKey]: { subjects: [{ name: "Fantasy" }] },
              "ISBN:unrequested": { subjects: [{ name: "Private" }] },
            }),
          ),
        );
      });
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(provider).toHaveBeenCalledOnce();
    const url = new URL(String(provider.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://openlibrary.org/api/books");
    const keys = url.searchParams.get("bibkeys")!.split(",");
    expect(keys.length).toBe(10);
    expect(keys.every((key) => key.startsWith("ISBN:978"))).toBe(true);
    expect(url.searchParams.get("format")).toBe("json");
    expect(abortSignal).toHaveBeenCalled();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("Fantasy");
    expect(logged).not.toContain("Private");
    expect(logged).not.toContain("private-user");
    expect(logged).not.toContain(importId);
    expect(logged).not.toContain("my_rating");
    expect(logged).toContain("https://openlibrary.org/api/books?");
    expect(logged).toContain("responseStatus");
    expect(logged).toContain("parsed");
  });

  it("fails closed on page errors and a stalled database read", async () => {
    pages = [{ data: null, error: { message: "secret" } }];
    const provider = vi.spyOn(globalThis, "fetch");
    expect((await post()).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
    vi.useFakeTimers();
    pendingPage = true;
    const result = post();
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await result).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
    expect(abortSignal.mock.calls.at(-1)?.[0].aborted).toBe(true);
  });

  it("aborts a stalled ownership lookup and returns unavailable", async () => {
    vi.useFakeTimers();
    pendingOwnership = true;
    const result = post();
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await result).status).toBe(503);
    expect(abortSignal).toHaveBeenCalledOnce();
    expect(abortSignal.mock.calls[0][0].aborted).toBe(true);
  });

  it.each(["redirect", "oversize", "stream-timeout", "provider-timeout"])(
    "rejects provider %s safely",
    async (failure) => {
      const record = {
        title: "private title",
        isbn: isbn(1),
        isbn13: "",
        my_rating: "5",
      };
      pages = [{ data: [record], error: null }];
      if (failure === "redirect")
        vi.spyOn(globalThis, "fetch").mockRejectedValue(
          new TypeError("secret redirect"),
        );
      if (failure === "oversize")
        vi.spyOn(globalThis, "fetch").mockResolvedValue(
          new Response(new Uint8Array(2 * 1024 * 1024 + 1)),
        );
      if (failure === "stream-timeout" || failure === "provider-timeout") {
        vi.useFakeTimers();
        vi.spyOn(globalThis, "fetch").mockImplementation(() =>
          failure === "stream-timeout"
            ? Promise.resolve(new Response(new ReadableStream({ pull() {} })))
            : new Promise(() => {}),
        );
      }
      const log = vi.spyOn(console, "log").mockImplementation(() => {});
      const responsePromise = post();
      if (failure === "stream-timeout" || failure === "provider-timeout")
        await vi.advanceTimersByTimeAsync(10_000);
      const response = await responsePromise;
      expect(await response.json()).toEqual({ ok: true });
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret redirect");
      expect(JSON.stringify(log.mock.calls)).not.toContain(importId);
      expect(JSON.stringify(log.mock.calls)).toContain(
        "https://openlibrary.org/api/books?",
      );
      expect(JSON.stringify(log.mock.calls)).toContain("responseStatus");
    },
  );

  it("records bounded status and shape diagnostics for provider failures", async () => {
    pages = [
      {
        data: [
          { title: "private title", isbn: isbn(2), isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", { status: 502 }),
    );
    await post();
    expect(JSON.stringify(log.mock.calls)).toContain('"responseStatus":502');
    expect(JSON.stringify(log.mock.calls)).toContain("http-error");
    expect(JSON.stringify(log.mock.calls)).toContain("not-json");

    log.mockClear();
    pages = [
      {
        data: [
          { title: "private title", isbn: isbn(2), isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    pageIndex = 0;
    vi.mocked(fetch).mockResolvedValueOnce(new Response("[]"));
    await post();
    expect(JSON.stringify(log.mock.calls)).toContain("invalid-top-level-shape");
    expect(JSON.stringify(log.mock.calls)).not.toContain("private-user");
    expect(JSON.stringify(log.mock.calls)).not.toContain(importId);
  });

  it("logs subjects only for Open Library entries and represents missing data as empty subjects", async () => {
    const fixtureIsbn = isbn(4);
    pages = [
      {
        data: [
          { title: "fixture", isbn: fixtureIsbn, isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          [`ISBN:${fixtureIsbn}`]: {
            subjects: [{ name: "Fantasy", url: "/subjects/fantasy" }],
          },
        }),
      ),
    );
    await post();
    const output = JSON.stringify(log.mock.calls);
    const serializedLog = log.mock.calls[0][1] as string;
    expect(serializedLog).toContain('"diagnostic":"parsed"');
    expect(serializedLog).toContain('"subjects":["Fantasy"]');
    expect(serializedLog).not.toContain('"matches"');
    expect(serializedLog).not.toContain('"no-match"');
    expect(serializedLog).not.toContain('"matched"');
    expect(output).not.toContain("[Array]");
    expect(output).not.toContain("invalid-shape");
  });

  it("bounds logged non-success response excerpts", async () => {
    pages = [
      {
        data: [
          { title: "private title", isbn: isbn(3), isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("x".repeat(4096), { status: 503 }),
    );
    await post();
    const output = JSON.stringify(log.mock.calls);
    const excerpt = output.match(/"bodyExcerpt":"(x+)"/)?.[1];
    expect(excerpt).toHaveLength(512);
    expect(output).not.toContain("private-user");
    expect(output).not.toContain(importId);
  });
});
