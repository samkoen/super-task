import { describe, expect, it, vi, afterEach } from "vitest";
import { toJpeg } from "html-to-image";
import { captureViewportPng, isSystemBugUi, visibleCaptureRoot } from "./systemBugCapture";

vi.mock("html-to-image", () => ({
  toJpeg: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ"),
  toBlob: vi.fn(),
}));

afterEach(() => {
  document.getElementById("root")?.remove();
  document.querySelectorAll(".MuiModal-root").forEach((el) => el.remove());
  vi.mocked(toJpeg).mockClear();
  vi.mocked(toJpeg).mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ");
});

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

describe("visibleCaptureRoot", () => {
  it("uses #root when no overlay is open", () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    expect(visibleCaptureRoot()).toBe(root);
  });

  it("uses the open task dialog instead of the main page", () => {
    const root = document.createElement("div");
    root.id = "root";
    const modal = document.createElement("div");
    modal.className = "MuiModal-root";
    document.body.append(root, modal);
    expect(visibleCaptureRoot()).toBe(modal);
  });

  it("ignores the bug-report dialog overlay", () => {
    const root = document.createElement("div");
    root.id = "root";
    const report = document.createElement("div");
    report.className = "MuiModal-root";
    report.setAttribute("data-system-bug-dialog", "");
    document.body.append(root, report);
    expect(visibleCaptureRoot()).toBe(root);
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
  });

  it("sends the visible dialog to html-to-image, not #root", async () => {
    const root = document.createElement("div");
    root.id = "root";
    const modal = document.createElement("div");
    modal.className = "MuiModal-root";
    document.body.append(root, modal);
    await captureViewportPng();
    expect(toJpeg).toHaveBeenCalledWith(modal, expect.any(Object));
  });

  it("keeps the visible scroll position on the clone", async () => {
    const root = document.createElement("div");
    root.id = "root";
    const panel = document.createElement("div");
    Object.defineProperty(panel, "scrollTop", { value: 80, writable: true, configurable: true });
    root.append(panel);
    document.body.append(root);
    vi.mocked(toJpeg).mockImplementation(async (node, options) => {
      const cloned = (node as HTMLElement).cloneNode(true) as HTMLElement;
      options?.onclone?.(document, cloned);
      expect((cloned.firstElementChild as HTMLElement).scrollTop).toBe(80);
      return "data:image/jpeg;base64,/9j/4AAQ";
    });
    await captureViewportPng();
  });
});
