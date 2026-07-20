import { Capacitor } from "@capacitor/core";

/** Capacitor natif OU WebView Android (UA), même si le bridge arrive tard. */
export function isNativeApp(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* bridge absent */
  }
  if (typeof navigator === "undefined") return false;
  // Chrome Android WebView : "; wv)" dans le User-Agent
  return /; wv\)/i.test(navigator.userAgent) || /WebView/i.test(navigator.userAgent);
}
