/** Inset bas (barre Samsung / iOS) pour ne pas cacher les contrôles. */
export function systemBottomInsetCss(): string {
  return "max(env(safe-area-inset-bottom, 0px), var(--app-nav-bottom, 0px))";
}

export function systemTopInsetCss(): string {
  return "max(env(safe-area-inset-top, 0px), var(--app-nav-top, 0px))";
}

export function withSystemBottomInsetCss(baseCss: string): string {
  return `calc(${baseCss} + ${systemBottomInsetCss()})`;
}

export function dialogActionsPbCss(): string {
  return withSystemBottomInsetCss("16px");
}

/** Fallback Android si le WebView ne renseigne pas env(safe-area-inset-*). */
export function applyAndroidNavBottomFallback(): void {
  applyAndroidInsetFallback("--app-nav-bottom", "64px");
  applyAndroidInsetFallback("--app-nav-top", "32px");
}

function applyAndroidInsetFallback(cssVar: string, fallback: string): void {
  if (typeof document === "undefined" || typeof navigator === "undefined") return;
  if (!/Android/i.test(navigator.userAgent)) return;
  const root = document.documentElement;
  const current = root.style.getPropertyValue(cssVar).trim();
  if (current && current !== "0" && current !== "0px") return;
  root.style.setProperty(cssVar, fallback);
}
