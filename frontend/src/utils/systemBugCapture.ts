export function isSystemBugUi(node: Node): boolean {
  return node instanceof Element && Boolean(node.closest("[data-system-bug-ignore]"));
}

export async function captureViewportPng(): Promise<Blob | null> {
  const root = document.body;
  if (!root) return null;
  try {
    const { toBlob } = await import("html-to-image");
    return await toBlob(root, {
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.25),
      cacheBust: true,
      skipFonts: true,
      filter: (node) => !isSystemBugUi(node),
    });
  } catch {
    return null;
  }
}
