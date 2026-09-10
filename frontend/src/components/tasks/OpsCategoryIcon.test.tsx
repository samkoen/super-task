import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import OpsCategoryIcon from "./OpsCategoryIcon";
import { he } from "../../i18n/he";

describe("OpsCategoryIcon", () => {
  it("renders the labelled icon for a known category", () => {
    render(<OpsCategoryIcon category="info_collection" />);
    expect(screen.getByTitle(he.opsCategoryLabels.info_collection)).toBeTruthy();
  });

  it("renders nothing without a category", () => {
    const { container } = render(<OpsCategoryIcon category={null} />);
    expect(container.textContent).toBe("");
    expect(screen.queryByTitle(he.opsCategoryLabels.cleaning)).toBeNull();
  });
});
