import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  createClient: vi.fn(),
  loadSubjectCandidates: vi.fn(),
}));
vi.mock("@/lib/supabase/auth", () => ({
  requireAdminUser: mocks.requireAdminUser,
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/subjects/admin-subject-candidates", () => ({
  loadSubjectCandidates: mocks.loadSubjectCandidates,
}));
import AdminSubjectsPage from "@/app/app/admin/subjects/page";

describe("admin subjects route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdminUser.mockResolvedValue({ id: "admin" });
    mocks.createClient.mockResolvedValue({});
    mocks.loadSubjectCandidates.mockResolvedValue([]);
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
    await AdminSubjectsPage();
    expect(order).toEqual(["auth", "client", "query"]);
  });
  it("renders query error state", async () => {
    mocks.loadSubjectCandidates.mockRejectedValue(new Error("db failure"));
    const view = await AdminSubjectsPage();
    expect(view.props.error).toBe(true);
    expect(view.props.candidates).toEqual([]);
  });
});
