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
    expect(screen.getByText("1 candidates")).toBeInTheDocument();
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
});
