import { Capacitor } from "@capacitor/core";

/**
 * Résout l'URL de base Axios.
 * - Navigateur / Vite : `/api` (proxy)
 * - APK Capacitor « live » (server.url → IP:5173) : `/api`
 * - APK bundlé : `VITE_API_URL`, sinon émulateur `10.0.2.2`
 */
export function resolveApiBaseUrl(
  /** Passer `null` pour ignorer `VITE_API_URL` (tests). */
  envUrl?: string | null,
  options?: { isNative?: boolean; origin?: string }
): string {
  const fromEnv =
    envUrl === null
      ? undefined
      : (envUrl ?? (import.meta.env.VITE_API_URL as string | undefined));
  const trimmed = fromEnv?.trim();
  if (trimmed) return trimmed.replace(/\/$/, "");

  const isNative = options?.isNative ?? Capacitor.isNativePlatform();
  if (!isNative) return "/api";

  const origin =
    options?.origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  try {
    const url = new URL(origin || "https://localhost");
    const http = url.protocol === "http:" || url.protocol === "https:";
    const bundledHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    // Live-reload Capacitor : page servie depuis le Vite du PC (ex. http://192.168.x.x:5173)
    if (http && !bundledHost) return "/api";
  } catch {
    /* ignore invalid origin */
  }

  // Émulateur Android → machine hôte. Sur téléphone physique : définir VITE_API_URL.
  return "http://10.0.2.2:5001/api";
}
