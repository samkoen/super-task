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
  const host = hostnameOf(url);
  return Boolean(host?.includes("blob.vercel-storage.com"));
}

export function isRemoteObjectMediaUrl(url: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  return host.endsWith(".r2.cloudflarestorage.com") || host.endsWith(".r2.dev");
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isPrivateObjectMediaUrl(url: string): boolean {
  return isRemoteObjectMediaUrl(url);
}

export function withStreamQuery(url: string): string {
  if (url.startsWith("blob:") || /(?:^|[?&])stream=/.test(url)) return url;
  if (!url.includes("proxy?")) return url;
  return `${url}${url.includes("?") ? "&" : "?"}stream=1`;
}

/** Same-origin bytes for canvas annotation — avoids a CORS 302 to R2. */
export function mediaStreamUrl(path: string | null | undefined): string | null {
  const url = mediaUrl(path);
  if (!url) return null;
  return withStreamQuery(url);
}

/** @deprecated alias — R2 only */
export const isPrivateVercelBlobUrl = isPrivateObjectMediaUrl;
