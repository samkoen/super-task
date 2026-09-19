import { afterEach, describe, expect, it, vi } from "vitest";
import { isPageVisible, onPageVisible } from "./pageVisible";

describe("pageVisible", () => {
  afterEach(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });
  it("treats a missing document as visible", () => {
    expect(isPageVisible()).toBe(true);
  });

  it("skips work while the page is hidden", () => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    expect(isPageVisible()).toBe(false);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    expect(isPageVisible()).toBe(true);
  });

  it("runs the handler when the page becomes visible", () => {
    const handler = vi.fn();
    const stop = onPageVisible(handler);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(handler).toHaveBeenCalledTimes(1);
    stop();
  });
});
