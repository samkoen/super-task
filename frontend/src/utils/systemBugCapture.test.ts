import { describe, expect, it, vi, afterEach } from "vitest";
import { toJpeg, toBlob } from "html-to-image";
import { withSafeComputedColors } from "./systemBugCaptureColors";
import {
  captureViewportPng,
  cssValueToSafeColor,
  isSystemBugUi,
  visibleCaptureRoot,
} from "./systemBugCapture";

vi.mock("html-to-image", () => ({
  toJpeg: vi.fn().mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ"),
  toBlob: vi.fn(),
}));

afterEach(() => {
  document.getElementById("root")?.remove();
  document.querySelectorAll("main").forEach((el) => el.remove());
  document.querySelectorAll(".MuiModal-root").forEach((el) => el.remove());
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  Object.defineProperty(window, "scrollX", { value: 0, configurable: true });
  vi.mocked(toJpeg).mockClear();
  vi.mocked(toJpeg).mockResolvedValue("data:image/jpeg;base64,/9j/4AAQ");
  vi.mocked(toBlob).mockReset();
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

  it("uses the page scroller instead of the full document", () => {
    const root = document.createElement("div");
    root.id = "root";
    const main = document.createElement("main");
    root.append(main);
    document.body.append(root);
    expect(visibleCaptureRoot()).toBe(main);
  });

  it("uses the open task dialog instead of the main page", () => {
    const root = document.createElement("div");
    root.id = "root";
    const modal = document.createElement("div");
    modal.className = "MuiModal-root";
    document.body.append(root, modal);
    expect(visibleCaptureRoot()).toBe(modal);
  });

  it("captures the dialog paper, not the full-screen backdrop", () => {
    const root = document.createElement("div");
    root.id = "root";
    const modal = document.createElement("div");
    modal.className = "MuiModal-root";
    const paper = document.createElement("div");
    paper.className = "MuiDialog-paper";
    modal.append(paper);
    document.body.append(root, modal);
    expect(visibleCaptureRoot()).toBe(paper);
  });

  it("ignores a closed keepMounted modal", () => {
    const root = document.createElement("div");
    root.id = "root";
    const hidden = document.createElement("div");
    hidden.className = "MuiModal-root";
    hidden.setAttribute("aria-hidden", "true");
    document.body.append(root, hidden);
    expect(visibleCaptureRoot()).toBe(root);
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

describe("cssValueToSafeColor", () => {
  it("leaves ordinary rgb colors unchanged", () => {
    expect(cssValueToSafeColor("rgb(10, 20, 30)")).toBe("rgb(10, 20, 30)");
  });

  it("rewrites oklch so the SVG clone can serialize", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    expect(cssValueToSafeColor("oklch(0.5 0.1 20)").toLowerCase()).not.toContain("oklch");
  });

  it("restores getPropertyValue after the capture patch", async () => {
    const proto = CSSStyleDeclaration.prototype;
    const before = proto.getPropertyValue;
    await withSafeComputedColors(async () => {
      expect(proto.getPropertyValue).not.toBe(before);
    });
    expect(proto.getPropertyValue).toBe(before);
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
    expect(toJpeg).toHaveBeenCalledWith(modal, expect.objectContaining({ backgroundColor: "#ffffff" }));
  });

  it("clamps the capture to the visible viewport", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    await captureViewportPng();
    const options = vi.mocked(toJpeg).mock.calls[0][1] as { width: number; height: number };
    expect(options.width).toBeLessThanOrEqual(window.innerWidth);
    expect(options.height).toBeLessThanOrEqual(window.innerHeight);
  });

  it("keeps the visible scroll position on the clone", async () => {
    const root = document.createElement("div");
    root.id = "root";
    const panel = document.createElement("div");
    panel.style.overflow = "auto";
    const inner = document.createElement("div");
    panel.append(inner);
    Object.defineProperty(panel, "scrollTop", { value: 80, writable: true, configurable: true });
    root.append(panel);
    document.body.append(root);
    vi.mocked(toJpeg).mockImplementation(async () => {
      expect(inner.style.transform).toContain("-80px");
      expect(panel.scrollTop).toBe(0);
      return "data:image/jpeg;base64,/9j/4AAQ";
    });
    await captureViewportPng();
    expect(inner.style.transform).toBe("");
    expect(panel.scrollTop).toBe(80);
  });

  it("shifts the page for window scroll so the shot matches the screen", async () => {
    const root = document.createElement("div");
    root.id = "root";
    const inner = document.createElement("div");
    root.append(inner);
    document.body.append(root);
    const scrollY = Object.getOwnPropertyDescriptor(window, "scrollY");
    Object.defineProperty(window, "scrollY", { value: 120, configurable: true });
    vi.mocked(toJpeg).mockImplementation(async () => {
      expect(inner.style.transform).toContain("-120px");
      return "data:image/jpeg;base64,/9j/4AAQ";
    });
    await captureViewportPng();
    if (scrollY) Object.defineProperty(window, "scrollY", scrollY);
    else delete (window as { scrollY?: number }).scrollY;
    expect(inner.style.transform).toBe("");
  });

  it("returns null instead of throwing when html-to-image fails", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);
    vi.mocked(toJpeg).mockRejectedValue(new Error("oklch"));
    vi.mocked(toBlob).mockRejectedValue(new Error("oklch"));
    await expect(captureViewportPng()).resolves.toBeNull();
  });
});
