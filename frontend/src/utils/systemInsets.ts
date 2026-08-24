/** Inset bas (barre Samsung / iOS) pour ne pas cacher les boutons de dialogue. */
export function systemBottomInsetCss(): string {
  return "max(env(safe-area-inset-bottom, 0px), var(--app-nav-bottom, 0px))";
}

export function dialogActionsPbCss(): string {
  return `calc(16px + ${systemBottomInsetCss()})`;
}

/** Fallback Android si le WebView ne renseigne pas env(safe-area-inset-bottom). */
export function applyAndroidNavBottomFallback(): void {
  if (typeof document === "undefined" || typeof navigator === "undefined") return;
  if (!/Android/i.test(navigator.userAgent)) return;
  const root = document.documentElement;
  const current = root.style.getPropertyValue("--app-nav-bottom").trim();
  if (current && current !== "0" && current !== "0px") return;
  root.style.setProperty("--app-nav-bottom", "64px");
}
