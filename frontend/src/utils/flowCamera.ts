/** Logique pure de la caméra vidéo du FLOW (Figma 06 / 07) : durées, anneau, consigne. */

/** Durée maximale du Figma (« בין 10 ל-60 שניות »). Si le menahel exige plus, c'est le minimum qui prime. */
export const FLOW_VIDEO_MAX_SECONDS = 60;

export const RING_RADIUS = 37.6;
export const RING_STROKE = 4.8;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_CENTER = 40;

export function flowMaxSeconds(minSeconds: number | null | undefined): number {
  return Math.max(FLOW_VIDEO_MAX_SECONDS, minSeconds && minSeconds > 0 ? minSeconds : 0);
}

export type RecordRing = {
  /** Longueur de l'arc blanc déjà parcouru (même unité que `RING_CIRCUMFERENCE`). */
  arcLength: number;
  /** Position du point vert « minimum atteint », ou null sans minimum. */
  marker: { x: number; y: number } | null;
  minReached: boolean;
};

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** Anneau d'enregistrement : arc de progression depuis le haut, point du minimum sur le cercle. */
export function recordRing(elapsedSeconds: number, minSeconds: number | null | undefined): RecordRing {
  const total = flowMaxSeconds(minSeconds);
  const min = minSeconds && minSeconds > 0 ? minSeconds : null;
  const angle = min ? clampRatio(min / total) * 2 * Math.PI : 0;
  return {
    arcLength: clampRatio(elapsedSeconds / total) * RING_CIRCUMFERENCE,
    marker: min
      ? { x: RING_CENTER + RING_RADIUS * Math.sin(angle), y: RING_CENTER - RING_RADIUS * Math.cos(angle) }
      : null,
    minReached: min === null || elapsedSeconds >= min,
  };
}

/** Le chrono s'arrête tout seul à la durée maximale. */
export function shouldAutoStop(elapsedSeconds: number, minSeconds: number | null | undefined): boolean {
  return elapsedSeconds >= flowMaxSeconds(minSeconds);
}

/** Deuxième ligne de la consigne : « וצלמו בין 10 ל-60 שניות. » */
export function durationLine(minSeconds: number | null | undefined, text: {
  between: (min: number, max: number) => string;
  upTo: (max: number) => string;
}): string {
  const max = flowMaxSeconds(minSeconds);
  return minSeconds && minSeconds > 0 ? text.between(minSeconds, max) : text.upTo(max);
}
