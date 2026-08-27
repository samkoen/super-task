import { describe, expect, it, afterEach, vi } from "vitest";
import {
  applyAndroidNavBottomFallback,
  dialogActionsPbCss,
  systemBottomInsetCss,
  systemTopInsetCss,
  withSystemBottomInsetCss,
} from "./systemInsets";

describe("systemInsets", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--app-nav-bottom");
    document.documentElement.style.removeProperty("--app-nav-top");
    vi.unstubAllGlobals();
  });

  it("keeps dialog actions above the system navigation bar", () => {
    expect(systemBottomInsetCss()).toContain("safe-area-inset-bottom");
    expect(systemBottomInsetCss()).toContain("--app-nav-bottom");
    expect(systemTopInsetCss()).toContain("safe-area-inset-top");
    expect(systemTopInsetCss()).toContain("--app-nav-top");
    expect(dialogActionsPbCss()).toContain("16px");
    expect(dialogActionsPbCss()).toContain("max(");
    expect(withSystemBottomInsetCss("24px")).toContain("24px");
    expect(withSystemBottomInsetCss("24px")).toContain("--app-nav-bottom");
  });

  it("sets an Android fallback when the inset env is missing", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14; SAMSUNG)" });
    applyAndroidNavBottomFallback();
    expect(document.documentElement.style.getPropertyValue("--app-nav-bottom")).toBe("64px");
    expect(document.documentElement.style.getPropertyValue("--app-nav-top")).toBe("32px");
  });

  it("does not override a native inset already applied", () => {
    document.documentElement.style.setProperty("--app-nav-bottom", "24px");
    document.documentElement.style.setProperty("--app-nav-top", "18px");
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14)" });
    applyAndroidNavBottomFallback();
    expect(document.documentElement.style.getPropertyValue("--app-nav-bottom")).toBe("24px");
    expect(document.documentElement.style.getPropertyValue("--app-nav-top")).toBe("18px");
  });

  it("replaces a native 0px inset that would hide dialog buttons", () => {
    document.documentElement.style.setProperty("--app-nav-bottom", "0px");
    document.documentElement.style.setProperty("--app-nav-top", "0px");
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Linux; Android 14; SAMSUNG)" });
    applyAndroidNavBottomFallback();
    expect(document.documentElement.style.getPropertyValue("--app-nav-bottom")).toBe("64px");
    expect(document.documentElement.style.getPropertyValue("--app-nav-top")).toBe("32px");
  });
});
