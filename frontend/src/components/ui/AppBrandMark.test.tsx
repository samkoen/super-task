import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { he } from "../../i18n/he";
import AppBrandMark, { APP_ICON_SRC } from "./AppBrandMark";

describe("AppBrandMark", () => {
  it("uses Hebrew display name and Latin technical name", () => {
    expect(he.appName).toBe("סופר-מן");
    expect(he.appNameLatin).toBe("super-man");
  });

  it("renders the logo with the Hebrew brand alt text", () => {
    render(<AppBrandMark />);
    const img = screen.getByRole("img", { name: "סופר-מן" });
    expect(img.getAttribute("src")).toBe(APP_ICON_SRC);
  });

  it("applies the requested size", () => {
    render(<AppBrandMark size={24} />);
    expect(screen.getByRole("img", { name: "סופר-מן" }).getAttribute("width")).toBe("24");
  });
});
