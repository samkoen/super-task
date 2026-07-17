/** Résout une URL média : preview locale, ou proxy API auth pour Blob /uploads. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("blob:")) return path;

  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (isPrivateVercelBlobUrl(path)) {
      return `${base}/api/media/proxy?src=${encodeURIComponent(path)}`;
    }
    return path;
  }

  if (path.startsWith("/uploads/")) {
    return `${base}/api/media/proxy?src=${encodeURIComponent(path)}`;
  }

  return `${base}${path}`;
}

export function isPrivateVercelBlobUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.includes(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}
