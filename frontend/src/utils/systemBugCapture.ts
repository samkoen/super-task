import { dataUrlToBlob } from "./photoAnnotation";
import { pickSystemBugPortalHost } from "./systemBugPortal";

export function isSystemBugUi(node: Node): boolean {
  return (
    node instanceof Element &&
    Boolean(node.closest("[data-system-bug-ignore], [data-system-bug-dialog]"))
  );
}

/** Modal / drawer visible, sinon la page — pas seulement #root (portails MUI). */
export function visibleCaptureRoot(): HTMLElement {
  const host = pickSystemBugPortalHost(document.body);
  if (host !== document.body) return host;
  return document.getElementById("root") ?? document.body;
}

export async function captureViewportPng(): Promise<Blob | null> {
  const root = visibleCaptureRoot();
  const unstamp = stampScrollOffsets(root);
  const options = captureOptions(root);
  try {
    const { toJpeg } = await import("html-to-image");
    return dataUrlToBlob(await toJpeg(root, options));
  } catch {
    return captureViewportFallback(root, options);
  } finally {
    unstamp();
  }
}

function captureOptions(root: HTMLElement) {
  const rect = root.getBoundingClientRect();
  return {
    pixelRatio: 1,
    quality: 0.7,
    cacheBust: true,
    skipFonts: true,
    width: Math.max(1, Math.round(rect.width || window.innerWidth)),
    height: Math.max(1, Math.round(rect.height || window.innerHeight)),
    filter: (node: Node) => !isSystemBugUi(node),
  };
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
  for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    const top = el.scrollTop;
    const left = el.scrollLeft;
    if (!top && !left) continue;
    restores.push(shiftChildrenForScroll(el, left, top));
    el.scrollTop = 0;
    el.scrollLeft = 0;
    restores.push(() => {
      el.scrollTop = top;
      el.scrollLeft = left;
    });
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

function shiftChildrenForScroll(el: HTMLElement, left: number, top: number): () => void {
  const children = Array.from(el.children) as HTMLElement[];
  const prev = children.map((child) => child.style.transform);
  const offset = `translate(${-left}px, ${-top}px)`;
  for (const child of children) {
    child.style.transform = child.style.transform ? `${offset} ${child.style.transform}` : offset;
  }
  return () => children.forEach((child, i) => {
    child.style.transform = prev[i];
  });
}
