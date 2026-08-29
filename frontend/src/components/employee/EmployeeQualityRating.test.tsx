import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeQualityRating from "./EmployeeQualityRating";
import { he } from "../../i18n/he";

describe("EmployeeQualityRating", () => {
  it("shows empty history", () => {
    render(<EmployeeQualityRating summary={{ average: null, count: 0, by_category: [] }} />);
    expect(screen.getByText(he.qualityRatingNone)).toBeTruthy();
  });

  it("shows overall stars and category chips", () => {
    render(
      <EmployeeQualityRating
        summary={{
          average: 4.5,
          count: 3,
          by_category: [
            { category: "cleaning", average: 5, count: 2 },
            { category: "other", average: 3.5, count: 1 },
          ],
        }}
      />,
    );
    expect(screen.getByText("4.5")).toBeTruthy();
    expect(screen.getByText(he.qualityRatingCount(3))).toBeTruthy();
    expect(screen.getByText(`${he.opsCategoryLabels.cleaning} 5.0`)).toBeTruthy();
    expect(screen.getByText(`${he.opsCategoryNone} 3.5`)).toBeTruthy();
  });
});
