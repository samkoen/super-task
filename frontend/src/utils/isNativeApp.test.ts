import { beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.fn();

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
}));

import { isNativeApp } from "./isNativeApp";

describe("isNativeApp", () => {
  beforeEach(() => {
    isNativePlatform.mockReset();
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0" });
  });

  it("is true when Capacitor reports native", () => {
    isNativePlatform.mockReturnValue(true);
    expect(isNativeApp()).toBe(true);
  });

  it("is true for Android WebView user agent", () => {
    isNativePlatform.mockReturnValue(false);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36",
    });
    expect(isNativeApp()).toBe(true);
  });

  it("is false in desktop Chrome", () => {
    isNativePlatform.mockReturnValue(false);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Chrome/120.0.0.0)",
    });
    expect(isNativeApp()).toBe(false);
  });
});
