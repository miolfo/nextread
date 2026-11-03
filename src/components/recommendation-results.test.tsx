import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RecommendationResults } from "@/components/recommendation-results";

describe("Recommendation results", () => {
  it("shows 12 fictional results and pages through them accessibly", async () => {
    const user = userEvent.setup();
    render(<RecommendationResults />);
    expect(
      screen.getByRole("heading", { name: "Your book recommendations" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Glass Observatory" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    expect(screen.getByText("5–8 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Atlas of Rain" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Previous recommendations" }),
    );
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "The Glass Observatory" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Previous recommendations" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Next recommendations" }),
    );
    expect(
      screen.getByRole("button", { name: "Next recommendations" }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Show recommendations 3" }),
    );
    expect(screen.getByText("9–12 of 12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Generate again" }));
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
  });

  it("supports moving backward with the mobile controls", async () => {
    const user = userEvent.setup();
    render(<RecommendationResults />);
    await user.click(screen.getByRole("button", { name: /^Next$/ }));
    expect(screen.getByText("5–8 of 12")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("1–4 of 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });
});
