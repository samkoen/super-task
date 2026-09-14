import { dataUrlToBlob } from "./photoAnnotation";
import { pickSystemBugPortalHost } from "./systemBugPortal";
import { cssValueToSafeColor, withSafeComputedColors } from "./systemBugCaptureColors";

export { cssValueToSafeColor };

export function isSystemBugUi(node: Node): boolean {
  return (
    node instanceof Element &&
    Boolean(node.closest("[data-system-bug-ignore], [data-system-bug-dialog]"))
  );
}

/** Modal / drawer visible, sinon le scroller de page — pas tout le document. */
export function visibleCaptureRoot(): HTMLElement {
  const host = pickSystemBugPortalHost(document.body);
  if (host !== document.body && isOpenCaptureHost(host)) {
    return overlayCaptureNode(host);
  }
  const main = document.querySelector("main");
  if (main instanceof HTMLElement && isOpenCaptureHost(main)) return main;
  return document.getElementById("root") ?? document.body;
}

export async function captureViewportPng(): Promise<Blob | null> {
  try {
    const root = visibleCaptureRoot();
    const unstamp = stampScrollOffsets(root);
    try {
      return await withSafeComputedColors(() => renderViewport(root));
    } finally {
      unstamp();
    }
  } catch {
    return null;
  }
}

function overlayCaptureNode(modal: HTMLElement): HTMLElement {
  const paper = modal.querySelector(".MuiDialog-paper, .MuiDrawer-paper, .MuiPaper-root");
  return paper instanceof HTMLElement ? paper : modal;
}

function isOpenCaptureHost(el: HTMLElement): boolean {
  return el.getAttribute("aria-hidden") !== "true" && !el.hasAttribute("hidden");
}

async function renderViewport(root: HTMLElement): Promise<Blob | null> {
  const options = captureOptions(root);
  try {
    const { toJpeg } = await import("html-to-image");
    return dataUrlToBlob(await toJpeg(root, options));
  } catch {
    return captureViewportFallback(root, options);
  }
}

function captureOptions(root: HTMLElement) {
  const width = visibleSide(root, "width");
  const height = visibleSide(root, "height");
  return {
    pixelRatio: 1,
    quality: 0.7,
    cacheBust: true,
    skipFonts: true,
    backgroundColor: "#ffffff",
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    filter: (node: Node) => !isSystemBugUi(node),
  };
}

function visibleSide(root: HTMLElement, side: "width" | "height"): number {
  const rect = root.getBoundingClientRect();
  const viewport = side === "width" ? window.innerWidth : window.innerHeight;
  const raw = rect[side] || viewport;
  return Math.max(1, Math.round(Math.min(raw, viewport)));
}

async function captureViewportFallback(
  root: HTMLElement,
  options: ReturnType<typeof captureOptions>,
): Promise<Blob | null> {
  try {
    const { toBlob } = await import("html-to-image");
    return (await toBlob(root, options)) ?? null;
  } catch {
    return null;
  }
}

function stampScrollOffsets(root: HTMLElement): () => void {
  const restores: Array<() => void> = [];
  try {
    restores.push(...stampWindowScroll(root));
    for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
      if (!(el instanceof HTMLElement)) continue;
      const top = el.scrollTop;
      const left = el.scrollLeft;
      if (!top && !left) continue;
      if (!isScrollContainer(el)) continue;
      restores.push(shiftChildrenForScroll(el, left, top));
      el.scrollTop = 0;
      el.scrollLeft = 0;
      restores.push(() => {
        el.scrollTop = top;
        el.scrollLeft = left;
      });
    }
  } catch {
    /* keep already-stamped offsets */
  }
  return () => {
    for (const restore of restores.reverse()) {
      try {
        restore();
      } catch {
        /* ignore */
      }
    }
  };
}

function stampWindowScroll(root: HTMLElement): Array<() => void> {
  if (root.closest(".MuiModal-root")) return [];
  if (root.scrollTop || root.scrollLeft) return [];
  const top = window.scrollY;
  const left = window.scrollX;
  if (!top && !left) return [];
  return [shiftChildrenForScroll(root, left, top)];
}

function isScrollContainer(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  return /(auto|scroll|hidden)/.test(`${style.overflowX} ${style.overflowY} ${style.overflow}`);
}

function shiftChildrenForScroll(el: HTMLElement, left: number, top: number): () => void {
  const children = Array.from(el.children).filter(isShiftableChild);
  const prev = children.map((child) => child.style.transform);
  const offset = `translate(${-left}px, ${-top}px)`;
  for (const child of children) {
    child.style.transform = child.style.transform ? `${offset} ${child.style.transform}` : offset;
  }
  return () => children.forEach((child, i) => {
    child.style.transform = prev[i];
  });
}

function isShiftableChild(node: Element): node is HTMLElement {
  if (!(node instanceof HTMLElement)) return false;
  const pos = getComputedStyle(node).position;
  return pos !== "fixed" && pos !== "sticky";
}
