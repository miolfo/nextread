import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/recommendations/route";

const { getUser, from, maybeSingle, abortSignal, rpc, rpcSignals } = vi.hoisted(
  () => ({
    getUser: vi.fn(),
    from: vi.fn(),
    maybeSingle: vi.fn(),
    rpc: vi.fn(),
    rpcSignals: [] as AbortSignal[],
    abortSignal: vi.fn((signal: AbortSignal) => {
      void signal;
    }),
  }),
);
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, from, rpc }),
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
  rpcSignals.length = 0;
  vi.useRealTimers();
  pageIndex = 0;
  pendingPage = false;
  pendingOwnership = false;
  ownership = { data: { id: importId }, error: null };
  pages = [{ data: [], error: null }];
  getUser.mockResolvedValue({ data: { user: { id: "private-user" } } });
  rpc.mockImplementation((name, args) => {
    const invalidBook =
      name === "save_recommendations" &&
      (args as { p_books: Record<string, unknown>[] }).p_books.some((book) =>
        Object.keys(book).some(
          (key) =>
            ![
              "key",
              "title",
              "author_name",
              "first_publish_year",
              "isbn",
              "cover_i",
            ].includes(key),
        ),
      );
    const result = Promise.resolve({
      data: "b0000000-0000-0000-0000-000000000001",
      error: invalidBook
        ? { code: "P0001", message: "invalid recommendation books" }
        : null,
    }) as Promise<{
      data: string;
      error: unknown;
    }> & {
      abortSignal: (signal: AbortSignal) => Promise<{ error: unknown }>;
    };
    result.abortSignal = (signal) => {
      rpcSignals.push(signal);
      return result;
    };
    return result;
  });
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
    expect((await post({ importId, sort: "popular" })).status).toBe(400);
    expect((await post({ importId, sort: 4 })).status).toBe(400);
    expect((await post({ importId, fromYear: -1 })).status).toBe(400);
    expect(
      (await post({ importId, fromYear: 2021, toYear: 2020 })).status,
    ).toBe(400);
    expect((await post({ importId, lengths: ["gigantic"] })).status).toBe(400);
    expect((await post({ importId, lengths: "short" })).status).toBe(400);
    expect((await post({ importId, includedGenres: ["Other"] })).status).toBe(
      400,
    );
    expect((await post({ importId, excludedGenres: [4] })).status).toBe(400);
    expect(
      (
        await post({
          importId,
          includedGenres: ["Fantasy"],
          excludedGenres: ["Fantasy"],
        })
      ).status,
    ).toBe(400);
    expect(from).not.toHaveBeenCalled();
  });

  it("does not read books or call provider for an invisible import", async () => {
    ownership = { data: null, error: null };
    const provider = vi.spyOn(globalThis, "fetch");
    expect((await post()).status).toBe(404);
    expect(from).toHaveBeenCalledOnce();
    expect(provider).not.toHaveBeenCalled();
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
        if (url.pathname === "/search.json")
          return Promise.resolve(new Response(JSON.stringify({ docs: [] })));
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
    expect(await response.json()).toEqual({
      ok: true,
      recommendationId: "b0000000-0000-0000-0000-000000000001",
      recommendations: [],
    });
    expect(provider).toHaveBeenCalledTimes(2);
    const url = new URL(String(provider.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://openlibrary.org/api/books");
    const keys = url.searchParams.get("bibkeys")!.split(",");
    expect(keys.length).toBe(10);
    expect(keys.every((key) => key.startsWith("ISBN:978"))).toBe(true);
    expect(url.searchParams.get("format")).toBe("json");
    expect(abortSignal).toHaveBeenCalled();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain("Fantasy");
    expect(logged).not.toContain("Private");
    expect(logged).not.toContain("private-user");
    expect(logged).not.toContain(importId);
    expect(logged).not.toContain("my_rating");
    expect(logged).not.toContain("https://openlibrary.org/api/books?");
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
    await vi.advanceTimersByTimeAsync(40_000);
    expect((await result).status).toBe(503);
    expect(provider).not.toHaveBeenCalled();
    expect(abortSignal.mock.calls.at(-1)?.[0].aborted).toBe(true);
  });

  it("aborts a stalled ownership lookup and returns unavailable", async () => {
    vi.useFakeTimers();
    pendingOwnership = true;
    const result = post();
    await vi.advanceTimersByTimeAsync(40_000);
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
        await vi.advanceTimersByTimeAsync(40_000);
      const response = await responsePromise;
      expect(await response.json()).toEqual({
        ok: true,
        recommendationId: "b0000000-0000-0000-0000-000000000001",
        recommendations: [],
      });
      expect(JSON.stringify(log.mock.calls)).not.toContain("secret redirect");
      expect(JSON.stringify(log.mock.calls)).not.toContain(importId);
      expect(JSON.stringify(log.mock.calls)).not.toContain(
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
    expect(JSON.stringify(log.mock.calls)).not.toContain("not-json");

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
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            [`ISBN:${fixtureIsbn}`]: {
              subjects: [{ name: "Fantasy", url: "/subjects/fantasy" }],
            },
          }),
        ),
      ),
    );
    await post();
    const output = JSON.stringify(log.mock.calls);
    const serializedLog = JSON.parse(
      log.mock.calls.find((call) => typeof call[1] === "string")![1] as string,
    );
    expect(serializedLog).not.toHaveProperty("books");
    expect(output).not.toContain("Fantasy");
    expect(rpc.mock.calls[0][1].p_candidates).toEqual([
      { subject: "Fantasy", count: 1 },
    ]);
    expect(serializedLog).not.toHaveProperty("matches");
    expect(serializedLog).not.toHaveProperty("no-match");
    expect(serializedLog).not.toHaveProperty("matched");
    expect(output).not.toContain("[Array]");
    expect(output).not.toContain("invalid-shape");
  });

  it("searches current subjects, excludes imported ISBNs, omits provider editions, deduplicates works, and logs bounded candidates only in development", async () => {
    const fixture = isbn(20);
    pages = [
      {
        data: [
          {
            title: "private import title",
            isbn: fixture,
            isbn13: "",
            my_rating: "5",
          },
        ],
        error: null,
      },
    ];
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const urls: URL[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = new URL(String(input));
      urls.push(url);
      if (url.pathname === "/search.json")
        return Promise.resolve(
          new Response(
            JSON.stringify({
              docs: [
                {
                  key: "/works/OL1W",
                  title: "Imported candidate",
                  isbn: [fixture],
                },
                {
                  key: "/works/OL2W",
                  title: "Keep candidate",
                  author_name: ["Available Author"],
                  author_key: ["/authors/OL3A"],
                  isbn: [isbn(21)],
                  editions: {
                    numFound: 3,
                    start: 0,
                    docs: [
                      {
                        key: "/books/OL22M",
                        title: "Unexpected provider edition",
                        language: ["eng"],
                      },
                    ],
                  },
                },
                { key: "/works/OL2W", title: "Duplicate" },
              ],
            }),
          ),
        );
      return Promise.resolve(
        new Response(
          JSON.stringify({
            [`ISBN:${fixture}`]: { subjects: [{ name: "Fantasy" }] },
          }),
        ),
      );
    });
    const response = await post({
      importId,
      fromYear: 1980,
      toYear: 2024,
      lengths: ["medium", "short", "medium"],
      includedGenres: ["Fantasy", "Science Fiction", "Fantasy"],
      excludedGenres: ["Horror"],
    });
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toEqual({
      ok: true,
      recommendationId: "b0000000-0000-0000-0000-000000000001",
      recommendations: [
        {
          key: "/works/OL2W",
          title: "Keep candidate",
          author_name: ["Available Author"],
          author_key: ["/authors/OL3A"],
          isbn: [isbn(21)],
        },
      ],
    });
    expect(rpc).toHaveBeenCalledWith("save_recommendations", {
      p_import_run_id: importId,
      p_books: [
        {
          key: "/works/OL2W",
          title: "Keep candidate",
          author_name: ["Available Author"],
          first_publish_year: undefined,
          isbn: [isbn(21)],
          cover_i: undefined,
        },
      ],
    });
    const search = urls.find((url) => url.pathname === "/search.json")!;
    expect(search.searchParams.get("q")).toBe(
      '(subject_key:"fantasy") AND language:eng AND (subject_key:"science_fiction" OR subject_key:"fantasy") AND NOT (subject_key:"horror") AND first_publish_year:[1980 TO 2024] AND (number_of_pages_median:[0 TO 249] OR number_of_pages_median:[250 TO 499])',
    );
    expect(search.searchParams.has("first_publish_year")).toBe(false);
    expect(search.searchParams.has("number_of_pages_median")).toBe(false);
    expect(search.searchParams.get("limit")).toBe("50");
    expect(search.searchParams.get("fields")).toBe(
      "key,title,author_name,author_key,first_publish_year,number_of_pages_median,isbn,cover_i",
    );
    expect(search.searchParams.get("fields")).not.toContain("editions");
    const diagnostic = log.mock.calls.find(
      (call) => call[0] === "Recommendation search complete",
    );
    expect(JSON.parse(diagnostic?.[1] as string)).toEqual({ resultCount: 1 });
    const searchLog = log.mock.calls.find(
      (call) => call[0] === "Open Library recommendation search",
    );
    const normalizedLog = JSON.parse(searchLog?.[1] as string);
    expect(normalizedLog).toMatchObject({
      filters: {
        fromYear: 1980,
        toYear: 2024,
        lengths: ["short", "medium"],
        includedGenres: ["science_fiction", "fantasy"],
        excludedGenres: ["horror"],
      },
      subjects: ["Fantasy"],
      sort: "relevance",
      pagination: { limit: 50, offset: 0 },
      url: search.href,
    });
  });

  it("aggregates exact subject names and sorts by count then alphabetically", async () => {
    const first = isbn(5);
    const second = isbn(6);
    pages = [
      {
        data: [
          { title: "first", isbn: first, isbn13: "", my_rating: "5" },
          { title: "second", isbn: second, isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            [`ISBN:${first}`]: {
              subjects: [
                { name: "Zebra" },
                { name: "Fantasy" },
                { name: "Fantasy" },
              ],
            },
            [`ISBN:${second}`]: {
              subjects: [{ name: "Zebra" }, { name: "Alpha" }],
            },
          }),
        ),
      ),
    );
    await post();
    const output = { candidates: rpc.mock.calls[0][1].p_candidates };
    expect(output.candidates).toEqual([
      { subject: "Zebra", count: 2 },
      { subject: "Alpha", count: 1 },
      { subject: "Fantasy", count: 1 },
    ]);
    expect(rpc).toHaveBeenCalledOnce();
    pageIndex = 0;
    await post();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[1][1]).toEqual(rpc.mock.calls[0][1]);
  });

  it("keeps genre and other filters identical across backfill requests", async () => {
    const fixture = isbn(25);
    pages = [
      {
        data: [
          { title: "imported", isbn: fixture, isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    const searchUrls: URL[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = new URL(String(input));
      if (url.pathname === "/search.json") {
        searchUrls.push(url);
        const docs =
          url.searchParams.get("offset") === "0"
            ? Array.from({ length: 50 }, (_, index) => ({
                key: `/works/OL${index + 10}W`,
                title: `No identity ${index}`,
              }))
            : [
                {
                  key: "/works/OL999W",
                  title: "Backfill result",
                  author_name: ["Unique Writer"],
                },
              ];
        return Promise.resolve(new Response(JSON.stringify({ docs })));
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            [`ISBN:${fixture}`]: { subjects: [{ name: "Fantasy" }] },
          }),
        ),
      );
    });

    const response = await post({
      importId,
      fromYear: 1950,
      toYear: 2000,
      lengths: ["short", "long"],
      includedGenres: ["Fantasy", "Science Fiction"],
      excludedGenres: ["Horror"],
    });

    expect(response.status).toBe(200);
    expect(searchUrls).toHaveLength(2);
    expect(searchUrls.map((url) => url.searchParams.get("offset"))).toEqual([
      "0",
      "50",
    ]);
    const queries = searchUrls.map((url) => url.searchParams.get("q"));
    expect(queries[0]).toBe(queries[1]);
    expect(queries[0]).toBe(
      '(subject_key:"fantasy") AND language:eng AND (subject_key:"science_fiction" OR subject_key:"fantasy") AND NOT (subject_key:"horror") AND first_publish_year:[1950 TO 2000] AND (number_of_pages_median:[0 TO 249] OR number_of_pages_median:[500 TO *])',
    );
  });

  it("returns unavailable when candidate persistence fails or stalls", async () => {
    pages = [
      {
        data: [{ title: "book", isbn: isbn(11), isbn13: "", my_rating: "5" }],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            [`ISBN:${isbn(11)}`]: { subjects: [{ name: "Fantasy" }] },
          }),
        ),
      ),
    );
    rpc.mockImplementationOnce(() => {
      const result = Promise.resolve({
        error: { message: "db failure" },
      }) as Promise<{ error: unknown }> & {
        abortSignal: (signal: AbortSignal) => Promise<{ error: unknown }>;
      };
      result.abortSignal = (signal) => {
        rpcSignals.push(signal);
        return result;
      };
      return result;
    });
    expect((await post()).status).toBe(503);

    vi.useFakeTimers();
    pageIndex = 0;
    rpcSignals.length = 0;
    rpc.mockImplementationOnce(() => {
      const result = new Promise(() => {}) as Promise<{ error: unknown }> & {
        abortSignal: (signal: AbortSignal) => Promise<{ error: unknown }>;
      };
      result.abortSignal = (signal) => {
        rpcSignals.push(signal);
        return result;
      };
      return result;
    });
    const pending = post();
    await vi.advanceTimersByTimeAsync(40_000);
    expect((await pending).status).toBe(503);
    expect(rpcSignals).toHaveLength(1);
    expect(rpcSignals[0].aborted).toBe(true);
  });

  it("preserves long subject names exactly and persists candidates", async () => {
    const first = isbn(8);
    const second = isbn(9);
    const prefix = "a".repeat(100);
    pages = [
      {
        data: [
          { title: "first", isbn: first, isbn13: "", my_rating: "5" },
          { title: "second", isbn: second, isbn13: "", my_rating: "5" },
        ],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          [`ISBN:${first}`]: { subjects: [{ name: `${prefix}x` }] },
          [`ISBN:${second}`]: { subjects: [{ name: `${prefix}y` }] },
        }),
      ),
    );
    await post();
    const output = { candidates: rpc.mock.calls[0][1].p_candidates };
    expect(output.candidates).toEqual([
      { subject: `${prefix}x`, count: 1 },
      { subject: `${prefix}y`, count: 1 },
    ]);
    expect(rpc).toHaveBeenCalledWith("record_subject_candidates", {
      p_candidates: output.candidates,
    });
  });

  it("logs an empty aggregate when selected books have no subjects", async () => {
    const fixtureIsbn = isbn(7);
    pages = [
      {
        data: [
          {
            title: "no subjects",
            isbn: fixtureIsbn,
            isbn13: "",
            my_rating: "5",
          },
        ],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({})),
    );
    await post();
    expect(rpc).toHaveBeenCalledWith("save_recommendations", {
      p_import_run_id: importId,
      p_books: [],
    });
  });

  it("does not log non-success response bodies", async () => {
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
    expect(output).not.toContain("x".repeat(20));
    expect(output).not.toContain("private-user");
    expect(output).not.toContain(importId);
  });

  it("logs RPC codes with safe phase only, retaining no error or payload details", async () => {
    pages = [
      {
        data: [{ title: "book", isbn: isbn(12), isbn13: "", my_rating: "5" }],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          [`ISBN:${isbn(12)}`]: { subjects: [{ name: "secret subject" }] },
        }),
      ),
    );
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockImplementationOnce(() => ({
      abortSignal: () =>
        Promise.resolve({
          error: {
            code: "42803",
            message: "failing row contains secret subject",
            details: "private-user detail",
          },
        }),
    }));
    const response = await post();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Unavailable" });
    expect(diagnostic).toHaveBeenCalledWith(
      "Recommendation experiment unavailable",
      {
        phase: "subject-candidates",
        code: "42803",
      },
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
      "secret subject",
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("private-user");
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain("failing row");
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(importId);
  });

  it("returns a sanitized unavailable response for recommendation RPC P0001", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockImplementationOnce(() => ({
      abortSignal: () =>
        Promise.resolve({
          data: null,
          error: {
            code: "P0001",
            message: "invalid recommendation books: private detail",
          },
        }),
    }));

    const response = await post();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Unavailable" });
    expect(diagnostic).toHaveBeenCalledWith(
      "Recommendation experiment unavailable",
      { phase: "recommendation-persistence", code: "P0001" },
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
      "private detail",
    );
  });

  it("logs import failures and persistence timeouts with safe phase and code", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    pages = [{ data: null, error: { message: "private import error" } }];
    expect((await post()).status).toBe(503);
    expect(diagnostic).toHaveBeenCalledWith(
      "Recommendation experiment unavailable",
      {
        phase: "import-books",
      },
    );

    pageIndex = 0;
    pages = [
      {
        data: [{ title: "book", isbn: isbn(13), isbn13: "", my_rating: "5" }],
        error: null,
      },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          [`ISBN:${isbn(13)}`]: { subjects: [{ name: "private subject" }] },
        }),
      ),
    );
    vi.useFakeTimers();
    rpc.mockImplementationOnce(() => ({
      abortSignal: () => new Promise(() => {}),
    }));
    const pending = post();
    await vi.advanceTimersByTimeAsync(40_000);
    expect((await pending).status).toBe(503);
    expect(diagnostic).toHaveBeenCalledWith(
      "Recommendation experiment unavailable",
      {
        phase: "subject-candidates",
        code: "SUBJECT_PERSISTENCE_TIMEOUT",
      },
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
      "private subject",
    );
    expect(JSON.stringify(diagnostic.mock.calls)).not.toContain(
      "private import error",
    );
  });
});
