/** Calculs purs de la découpe de la vidéo (bouton « חיתוך » de l'écran 08). Tout est en secondes. */
import { clamp01 } from "./flowPlayer";

export type TrimRange = { start: number; end: number };
export type TrimHandle = "start" | "end";

/** Une vidéo découpée garde au moins cette durée (la durée minimale du menahel reste contrôlée à la revue). */
export const MIN_TRIM_SECONDS = 1;
/** En dessous de cet écart, on considère que rien n'a été coupé. */
const UNCHANGED_EPSILON = 0.05;

export function fullRange(total: number): TrimRange {
  return { start: 0, end: Math.max(0, total) };
}

export function nearestHandle(range: TrimRange, seconds: number): TrimHandle {
  return Math.abs(seconds - range.start) <= Math.abs(seconds - range.end) ? "start" : "end";
}

/** Déplace une poignée sans jamais dépasser la vidéo ni l'autre poignée (écart minimal respecté). */
export function moveHandle(
  range: TrimRange,
  handle: TrimHandle,
  seconds: number,
  total: number,
  minGap: number = MIN_TRIM_SECONDS,
): TrimRange {
  const gap = Math.min(minGap, Math.max(0, total));
  const value = Math.min(total, Math.max(0, Number.isFinite(seconds) ? seconds : 0));
  if (handle === "start") return { start: Math.min(value, Math.max(0, range.end - gap)), end: range.end };
  return { start: range.start, end: Math.max(value, Math.min(total, range.start + gap)) };
}

export function isTrimmed(range: TrimRange, total: number): boolean {
  return range.start > UNCHANGED_EPSILON || total - range.end > UNCHANGED_EPSILON;
}

export function keptSeconds(range: TrimRange): number {
  return Math.max(0, Math.round(range.end - range.start));
}

/** Position d'une poignée en fraction de la barre (0 = début de la vidéo). */
export function handleRatio(seconds: number, total: number): number {
  return total > 0 ? clamp01(seconds / total) : 0;
}

/** Fenêtre de lecture pendant la découpe : la lecture reboucle au début de la sélection. */
export function playbackWindowStep(currentSeconds: number, range: TrimRange): "play" | "restart" {
  return currentSeconds >= range.end || currentSeconds < range.start - UNCHANGED_EPSILON ? "restart" : "play";
}
