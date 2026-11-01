import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  createClient: vi.fn(),
  loadSubjectCandidates: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect: mocks.redirect,
}));
vi.mock("@/lib/supabase/auth", () => ({
  requireAdminUser: mocks.requireAdminUser,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/subjects/admin-subject-candidates", () => ({
  loadSubjectCandidates: mocks.loadSubjectCandidates,
  SUBJECT_CANDIDATE_PAGE_SIZE: 20,
}));
import AdminSubjectsPage from "@/app/app/admin/subjects/page";

describe("admin subjects route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`redirect:${path}`);
    });
    mocks.requireAdminUser.mockResolvedValue({ id: "admin" });
    mocks.createClient.mockResolvedValue({});
    mocks.loadSubjectCandidates.mockResolvedValue({ candidates: [], total: 0 });
  });
  it("checks authorization before creating a client or querying", async () => {
    const order: string[] = [];
    mocks.requireAdminUser.mockImplementation(async () => {
      order.push("auth");
    });
    mocks.createClient.mockImplementation(async () => {
      order.push("client");
      return {};
    });
    mocks.loadSubjectCandidates.mockImplementation(async () => {
      order.push("query");
      return [];
    });
    await AdminSubjectsPage({ searchParams: Promise.resolve({}) });
    expect(order).toEqual(["auth", "client", "query"]);
  });
  it("renders query error state", async () => {
    mocks.loadSubjectCandidates.mockRejectedValue(new Error("db failure"));
    const view = await AdminSubjectsPage({ searchParams: Promise.resolve({}) });
    expect(view.props.error).toBe(true);
    expect(view.props.candidates).toEqual([]);
  });
  it("uses safe defaults for repeated and unsafe parameters", async () => {
    await AdminSubjectsPage({
      searchParams: Promise.resolve({
        page: ["9007199254740992", "3"],
        sort: ["candidate", "occurrences"],
        direction: "invalid",
      }),
    });
    expect(mocks.loadSubjectCandidates).toHaveBeenCalledWith(
      {},
      1,
      "occurrences",
      "desc",
    );
  });
  it("applies candidate defaults and valid query ordering", async () => {
    await AdminSubjectsPage({
      searchParams: Promise.resolve({ page: "2", sort: "candidate" }),
    });
    expect(mocks.loadSubjectCandidates).toHaveBeenCalledWith(
      {},
      2,
      "candidate",
      "asc",
    );
  });
  it("redirects an out-of-range request to the last page and preserves sorting", async () => {
    mocks.loadSubjectCandidates.mockResolvedValue({
      candidates: [],
      total: 41,
      page: Number.MAX_SAFE_INTEGER,
    });
    await expect(
      AdminSubjectsPage({
        searchParams: Promise.resolve({
          page: String(Number.MAX_SAFE_INTEGER),
          sort: "candidate",
          direction: "desc",
        }),
      }),
    ).rejects.toThrow(
      "redirect:/app/admin/subjects?page=3&sort=candidate&direction=desc",
    );
  });
});
