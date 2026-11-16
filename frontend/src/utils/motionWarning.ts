/** Détection de mouvement trop rapide pendant le tournage (Figma 07 « תנועה מהירה - האטו מעט »). */

/** Vitesse de rotation (°/s) au-delà de laquelle un panoramique est trop brusque. */
export const FAST_MOTION_DEG_PER_SEC = 120;
/** Nombre de mesures consécutives rapides pour éviter un faux positif. */
const CONSECUTIVE_FAST = 4;
/** L'alerte reste affichée ce temps après le dernier mouvement rapide. */
export const WARNING_HOLD_MS = 1500;

export type RotationRate = { alpha?: number | null; beta?: number | null; gamma?: number | null };

export function rotationMagnitude(rate: RotationRate | null | undefined): number {
  if (!rate) return 0;
  const parts = [rate.alpha, rate.beta, rate.gamma].map((value) => (typeof value === "number" ? value : 0));
  return Math.hypot(...parts);
}

export type MotionMonitor = {
  /** Enregistre une mesure ; renvoie vrai tant que l'alerte doit rester visible. */
  push: (degPerSec: number, nowMs: number) => boolean;
  reset: () => void;
};

export function createMotionMonitor(
  threshold: number = FAST_MOTION_DEG_PER_SEC,
  holdMs: number = WARNING_HOLD_MS,
): MotionMonitor {
  let streak = 0;
  let warnedAt: number | null = null;
  return {
    push(degPerSec, nowMs) {
      streak = degPerSec >= threshold ? streak + 1 : 0;
      if (streak >= CONSECUTIVE_FAST) warnedAt = nowMs;
      return warnedAt !== null && nowMs - warnedAt < holdMs;
    },
    reset() {
      streak = 0;
      warnedAt = null;
    },
  };
}
