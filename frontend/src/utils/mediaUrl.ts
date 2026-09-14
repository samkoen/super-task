/** Résout une URL média : preview locale, ou proxy API auth pour objet privé /uploads. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("blob:")) return path;

  const base = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "";

  if (path.startsWith("http://") || path.startsWith("https://")) {
    if (isPrivateObjectMediaUrl(path)) {
      return `${base}/api/media/proxy?src=${encodeURIComponent(path)}`;
    }
    return path;
  }

  if (path.startsWith("/uploads/")) {
    return `${base}/api/media/proxy?src=${encodeURIComponent(path)}`;
  }

  return `${base}${path}`;
}

export function isRemoteObjectMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.endsWith(".r2.cloudflarestorage.com") || host.includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isPrivateObjectMediaUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".r2.cloudflarestorage.com")) return true;
    return host.includes(".private.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/** @deprecated alias — R2 + Blob héritage */
export const isVercelBlobMediaUrl = isRemoteObjectMediaUrl;
export const isPrivateVercelBlobUrl = isPrivateObjectMediaUrl;
