import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AdminSubjectCandidates,
  AdminSubjectsView,
} from "@/components/admin-subject-candidates";

vi.mock("next/navigation", () => ({
  usePathname: () => "/app/admin/subjects",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("admin subject candidate display", () => {
  it("shows exact names and bigint text with inert accessible checkboxes", () => {
    const name = "Exact name <with> unusual / long text";
    const onChange = vi.fn();
    render(
      <AdminSubjectCandidates
        candidates={[{ subject: name, count: "9223372036854775807" }]}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "Candidate" }),
    ).toBeInTheDocument();
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText("9223372036854775807")).toBeInTheDocument();
    expect(screen.getByText(/Showing 1–1 of 1 candidates/)).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox", {
      name: `${name}: promoted`,
    });
    expect(checkbox).toBeDisabled();
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });
  it("shows empty and error states and places responsive layout in the component", () => {
    const { rerender } = render(
      <AdminSubjectsView candidates={[]} error={false} />,
    );
    expect(screen.getByText("No subject candidates yet.")).toBeInTheDocument();
    rerender(<AdminSubjectsView candidates={[]} error />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "currently unavailable",
    );
  });
  it("toggles sort, resets page for sorting, preserves order on page links, and bounds huge pagination", () => {
    const { rerender } = render(
      <AdminSubjectCandidates
        candidates={[{ subject: "A", count: "2" }]}
        total={200}
        page={5}
        sort="occurrences"
        direction="desc"
      />,
    );
    expect(screen.getByRole("link", { name: /Occurrences/ })).toHaveAttribute(
      "href",
      "/app/admin/subjects?page=1&sort=occurrences&direction=asc",
    );
    expect(screen.getByRole("link", { name: "Candidate" })).toHaveAttribute(
      "href",
      "/app/admin/subjects?page=1&sort=candidate&direction=asc",
    );
    expect(screen.getByRole("link", { name: "4" })).toHaveAttribute(
      "href",
      "/app/admin/subjects?page=4&sort=occurrences&direction=desc",
    );
    expect(screen.getByRole("link", { name: "6" })).toHaveAttribute(
      "href",
      "/app/admin/subjects?page=6&sort=occurrences&direction=desc",
    );
    rerender(
      <AdminSubjectCandidates
        candidates={[{ subject: "A", count: "2" }]}
        total={Number.MAX_SAFE_INTEGER}
        page={100}
      />,
    );
    expect(screen.getAllByRole("link").length).toBeLessThan(12);
    expect(screen.getByRole("link", { name: "100" })).toBeInTheDocument();
  });
});
