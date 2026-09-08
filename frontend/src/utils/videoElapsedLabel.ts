/** Compteur d'enregistrement : 1 / 5 comme sur le web. */
export function videoElapsedLabel(elapsedSeconds: number, minSeconds?: number | null): string {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  if (minSeconds && minSeconds > 0) {
    return `${elapsed} / ${minSeconds}`;
  }
  return String(elapsed);
}
