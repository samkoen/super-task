export function isSystemBugUi(node: Node): boolean {
  return node instanceof Element && Boolean(node.closest("[data-system-bug-ignore]"));
}

export async function captureViewportPng(): Promise<Blob | null> {
  const root = document.body;
  if (!root) return null;
  try {
    const { toJpeg } = await import("html-to-image");
    const dataUrl = await toJpeg(root, {
      pixelRatio: 1,
      quality: 0.7,
      cacheBust: true,
      skipFonts: true,
      filter: (node) => !isSystemBugUi(node),
    });
    const res = await fetch(dataUrl);
    return await res.blob();
  } catch {
    return null;
  }
}
