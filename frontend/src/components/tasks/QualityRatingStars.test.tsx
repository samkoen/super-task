import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import QualityRatingStars from "./QualityRatingStars";
import { he } from "../../i18n/he";

describe("QualityRatingStars", () => {
  it("lets the manager pick a star rating", () => {
    const onChange = vi.fn();
    render(<QualityRatingStars value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: "4 Stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("shows a read-only score", () => {
    render(<QualityRatingStars value={4.5} readOnly />);
    expect(screen.getByLabelText(he.qualityRating)).toBeTruthy();
    expect(screen.getByText("4.5")).toBeTruthy();
  });
});
