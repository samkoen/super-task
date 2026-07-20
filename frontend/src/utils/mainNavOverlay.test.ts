import { describe, expect, it } from "vitest";
import { shouldUseMainNavOverlay } from "./mainNavOverlay";

describe("shouldUseMainNavOverlay", () => {
  it("forces overlay nav on native so the bar can dismiss on click", () => {
    expect(shouldUseMainNavOverlay(true)).toBe(true);
  });

  it("keeps responsive layout on web (permanent sidebar from sm)", () => {
    expect(shouldUseMainNavOverlay(false)).toBe(false);
  });
});
