import { he } from "../i18n/he";
import { isNativeApp } from "./isNativeApp";

const MAX_START_URL = 1024;

export function normalizeStartUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > MAX_START_URL) return null;
  const lower = cleaned.toLowerCase();
  if (!lower.startsWith("https://") && !lower.startsWith("http://")) return null;
  return cleaned;
}

export function startUrlFieldError(value: string | null | undefined): string {
  if (!(value || "").trim()) return "";
  return normalizeStartUrl(value) ? "" : he.startUrlInvalid;
}

/** Doit rester synchrone dans le clic — un await avant bloque le popup desktop. */
export function openExternalUrl(url: string | null | undefined): boolean {
  const clean = normalizeStartUrl(url);
  if (!clean) return false;
  if (typeof window === "undefined") return false;
  if (isNativeApp()) {
    window.open(clean, "_blank");
    return true;
  }
  return clickNewTabLink(clean);
}

function clickNewTabLink(href: string): boolean {
  if (typeof document === "undefined") return false;
  const a = document.createElement("a");
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return true;
}
