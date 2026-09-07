import { describe, expect, it, vi } from "vitest";
import { captureViewportPng, isSystemBugUi } from "./systemBugCapture";

vi.mock("html-to-image", () => ({
  toJpeg: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ"),
  toBlob: vi.fn(),
}));

describe("isSystemBugUi", () => {
  it("skips the discreet report button in screenshots", () => {
    const wrap = document.createElement("div");
    wrap.setAttribute("data-system-bug-ignore", "");
    const icon = document.createElement("span");
    wrap.appendChild(icon);
    expect(isSystemBugUi(wrap)).toBe(true);
    expect(isSystemBugUi(icon)).toBe(true);
    expect(isSystemBugUi(document.createElement("div"))).toBe(false);
  });

  it("skips the report dialog chrome", () => {
    const title = document.createElement("h2");
    title.setAttribute("data-system-bug-dialog", "");
    expect(isSystemBugUi(title)).toBe(true);
  });
});

describe("captureViewportPng", () => {
  it("builds a jpeg blob from a data url without fetch", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.appendChild(root);
    const blob = await captureViewportPng();
    expect(blob?.type).toBe("image/jpeg");
    expect(blob?.size).toBeGreaterThan(0);
    root.remove();
  });
});
