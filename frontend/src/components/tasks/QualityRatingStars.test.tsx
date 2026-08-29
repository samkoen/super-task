import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import QualityRatingStars, { previewRating } from "./QualityRatingStars";
import { he } from "../../i18n/he";

function star(n: number) {
  return screen.getByRole("radio", { name: he.qualityStarLabel(n) });
}

describe("previewRating", () => {
  it("uses hover over the selected value", () => {
    expect(previewRating(1, 5)).toBe(1);
    expect(previewRating(0, 4)).toBe(4);
    expect(previewRating(0, null)).toBe(0);
  });
});

describe("QualityRatingStars", () => {
  it("lets the manager pick a star rating", () => {
    const onChange = vi.fn();
    render(<QualityRatingStars value={null} onChange={onChange} />);
    fireEvent.click(star(4));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("lights stars from the left in LTR even inside an RTL parent", () => {
    render(
      <div dir="rtl">
        <QualityRatingStars value={null} onChange={vi.fn()} />
      </div>,
    );
    fireEvent.mouseEnter(star(1));
    expect(star(1).getAttribute("data-filled")).toBe("true");
    expect(star(5).getAttribute("data-filled")).toBe("false");

    fireEvent.mouseEnter(star(5));
    expect(star(1).getAttribute("data-filled")).toBe("true");
    expect(star(5).getAttribute("data-filled")).toBe("true");
  });

  it("shows a read-only score", () => {
    render(<QualityRatingStars value={4.5} readOnly />);
    expect(screen.getByLabelText(he.qualityRating)).toBeTruthy();
    expect(screen.getByText("4.5")).toBeTruthy();
  });
});
