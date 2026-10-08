import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionHeading from "./SectionHeading";

describe("SectionHeading", () => {
  it("renders the title as a heading with a count pill", () => {
    render(<SectionHeading title="ממתינות לאישור" count={4} />);
    expect(screen.getByRole("heading", { name: "ממתינות לאישור" })).toBeTruthy();
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("hides the count when it is zero or missing", () => {
    const { rerender } = render(<SectionHeading title="כותרת" count={0} />);
    expect(screen.queryByText("0")).toBeNull();
    rerender(<SectionHeading title="כותרת" />);
    expect(screen.getByText("כותרת")).toBeTruthy();
  });

  it("renders trailing controls", () => {
    render(<SectionHeading title="כותרת" trailing={<button type="button">סינון</button>} />);
    expect(screen.getByRole("button", { name: "סינון" })).toBeTruthy();
  });

  it("accepts a hex color for the accent", () => {
    render(<SectionHeading title="כותרת" count={2} color="#c62828" />);
    expect(screen.getByText("2")).toBeTruthy();
  });
});
