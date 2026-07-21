import { Capacitor } from "@capacitor/core";

/**
 * Résout l'URL de base Axios.
 * - Chrome / Vite localhost : `/api` → proxy vers backend local (:5001)
 * - APK bundlé : `VITE_API_URL` (Vercel en prod)
 * - APK live-reload LAN : `/api`
 * - Émulateur sans VITE_API_URL : `10.0.2.2:5001`
 */
export function resolveApiBaseUrl(
  /** Passer `null` pour ignorer `VITE_API_URL` (tests). */
  envUrl?: string | null,
  options?: { isNative?: boolean; origin?: string }
): string {
  const isNative = options?.isNative ?? Capacitor.isNativePlatform();
  const origin =
    options?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  // Navigateur local : toujours le backend local via proxy Vite (ignorer Vercel du .env).
  if (!isNative && isLocalDevOrigin(origin)) {
    return "/api";
  }

  const fromEnv =
    envUrl === null
      ? undefined
      : (envUrl ?? (import.meta.env.VITE_API_URL as string | undefined));
  const trimmed = fromEnv?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");

  if (!isNative) return "/api";

  try {
    const url = new URL(origin || "https://localhost");
    const http = url.protocol === "http:" || url.protocol === "https:";
    const bundledHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    // Live-reload Capacitor : page servie depuis le Vite du PC
    if (http && !bundledHost) return "/api";
  } catch {
    /* ignore invalid origin */
  }

  return "http://10.0.2.2:5001/api";
}

export function isLocalDevOrigin(origin: string): boolean {
  if (!origin) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}
