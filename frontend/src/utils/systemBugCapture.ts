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
    onclone: (_doc: Document, cloned?: HTMLElement) => {
      if (cloned) restoreClonedScroll(cloned);
    },
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
  const stamped: HTMLElement[] = [];
  for (const el of [root, ...root.querySelectorAll<HTMLElement>("*")]) {
    if (!el.scrollTop && !el.scrollLeft) continue;
    el.dataset.bugScrollTop = String(el.scrollTop);
    el.dataset.bugScrollLeft = String(el.scrollLeft);
    stamped.push(el);
  }
  return () => {
    for (const el of stamped) {
      delete el.dataset.bugScrollTop;
      delete el.dataset.bugScrollLeft;
    }
  };
}

function restoreClonedScroll(cloned: HTMLElement) {
  for (const el of [cloned, ...cloned.querySelectorAll<HTMLElement>("*")]) {
    if (el.dataset.bugScrollTop) el.scrollTop = Number(el.dataset.bugScrollTop);
    if (el.dataset.bugScrollLeft) el.scrollLeft = Number(el.dataset.bugScrollLeft);
    delete el.dataset.bugScrollTop;
    delete el.dataset.bugScrollLeft;
  }
}
