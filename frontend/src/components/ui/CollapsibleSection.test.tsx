import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CollapsibleSection from "./CollapsibleSection";

describe("CollapsibleSection", () => {
  it("starts closed and opens when the button is pressed", () => {
    render(
      <CollapsibleSection label="הוספת הערה">
        <input aria-label="note" />
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole("button", { name: "הוספת הערה" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the content mounted so typed text is never lost", () => {
    render(
      <CollapsibleSection label="הוספת הערה">
        <input aria-label="note" defaultValue="" />
      </CollapsibleSection>,
    );
    const input = screen.getByLabelText("note") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "טקסט" } });
    fireEvent.click(screen.getByRole("button", { name: "הוספת הערה" }));
    fireEvent.click(screen.getByRole("button", { name: "הוספת הערה" }));
    expect((screen.getByLabelText("note") as HTMLInputElement).value).toBe("טקסט");
  });

  it("can be opened from the parent and reports user toggles", () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <CollapsibleSection label="more" open={false} onOpenChange={onOpenChange}>
        <span>content</span>
      </CollapsibleSection>,
    );
    const toggle = screen.getByRole("button", { name: "more" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(onOpenChange).toHaveBeenCalledWith(true);
    rerender(
      <CollapsibleSection label="more" open onOpenChange={onOpenChange}>
        <span>content</span>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: "more" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("can start open when there is already content", () => {
    render(
      <CollapsibleSection label="הוספת הערה" defaultOpen>
        <span>קיים</span>
      </CollapsibleSection>,
    );
    expect(screen.getByRole("button", { name: "הוספת הערה" }).getAttribute("aria-expanded")).toBe("true");
  });
});
