import { dataUrlToBlob } from "./photoAnnotation";

export function isSystemBugUi(node: Node): boolean {
  return (
    node instanceof Element &&
    Boolean(node.closest("[data-system-bug-ignore], [data-system-bug-dialog]"))
  );
}

export async function captureViewportPng(): Promise<Blob | null> {
  const root = document.getElementById("root") ?? document.body;
  if (!root) return null;
  const options = captureOptions();
  try {
    const { toJpeg } = await import("html-to-image");
    return dataUrlToBlob(await toJpeg(root, options));
  } catch {
    return captureViewportFallback(root, options);
  }
}

function captureOptions() {
  return {
    pixelRatio: 1,
    quality: 0.7,
    cacheBust: true,
    skipFonts: true,
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
