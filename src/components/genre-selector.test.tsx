import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GenreSelector, type Genre } from "@/components/genre-selector";

describe("Genre selector spacing", () => {
  it.each(["Include genres", "Exclude genres"])(
    "%s uses a flex gap rather than sibling margins with and without badges",
    async (label) => {
      const user = userEvent.setup();
      const onToggle = vi.fn();
      const { rerender } = render(
        <GenreSelector label={label} selected={[]} onToggle={onToggle} />,
      );

      for (const selected of [[], ["Fantasy"]] as Genre[][]) {
        rerender(
          <GenreSelector
            label={label}
            selected={selected}
            onToggle={onToggle}
          />,
        );
        const trigger = screen.getByLabelText(label);
        const wrapper = trigger.parentElement!;
        const expectGapSpacing = () => {
          expect(wrapper).toHaveClass("flex", "flex-col", "gap-2");
          expect(wrapper.className).not.toMatch(/\bspace-y-/);
        };

        expectGapSpacing();
        await user.click(trigger);
        expectGapSpacing();
        expect(
          await screen.findByRole("option", { name: "Fantasy" }),
        ).toHaveAttribute("aria-checked", String(selected.includes("Fantasy")));
        await user.keyboard("{Escape}");
        expect(trigger).toHaveFocus();
        expectGapSpacing();
        expect(onToggle).not.toHaveBeenCalled();
      }
    },
  );
});
