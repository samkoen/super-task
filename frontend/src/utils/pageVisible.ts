export function isPageVisible(): boolean {
  return typeof document === "undefined" || document.visibilityState !== "hidden";
}

export function onPageVisible(handler: () => void): () => void {
  const onVisible = () => {
    if (isPageVisible()) handler();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => document.removeEventListener("visibilitychange", onVisible);
}
