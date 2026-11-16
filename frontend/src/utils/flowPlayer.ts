/** Calculs purs du lecteur de revue (Figma 08) : la lecture avance de droite à gauche (RTL). */

export const PLAYBACK_SPEEDS = [0.5, 1] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export function speedLabel(speed: PlaybackSpeed): string {
  return `${speed}×`;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}

/** Durée affichée : celle mesurée à l'enregistrement, sinon celle de la vidéo si elle est finie. */
export function playerTotalSeconds(recorded: number | null | undefined, mediaDuration: number): number {
  if (recorded && recorded > 0) return recorded;
  return Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : 0;
}

export function playbackRatio(currentSeconds: number, totalSeconds: number): number {
  return totalSeconds > 0 ? clamp01(currentSeconds / totalSeconds) : 0;
}

/** Position d'un toucher sur la barre (RTL : le début est à droite). */
export function seekRatioFromPointer(clientX: number, rect: { left: number; width: number }): number {
  return rect.width > 0 ? clamp01((rect.left + rect.width - clientX) / rect.width) : 0;
}
