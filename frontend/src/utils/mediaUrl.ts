import { resolveApiBaseUrl } from "../services/apiBaseUrl";

/** Résout une URL média : preview locale, ou proxy API auth pour objet privé /uploads. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("blob:")) return path;
  if (isVercelBlobMediaUrl(path)) return null;

  const base = resolveApiBaseUrl().replace(/\/api$/, "");

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

export function isVercelBlobMediaUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().includes("blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isRemoteObjectMediaUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase().endsWith(".r2.cloudflarestorage.com");
  } catch {
    return false;
  }
}

export function isPrivateObjectMediaUrl(url: string): boolean {
  return isRemoteObjectMediaUrl(url);
}

/** @deprecated alias — R2 only */
export const isPrivateVercelBlobUrl = isPrivateObjectMediaUrl;
