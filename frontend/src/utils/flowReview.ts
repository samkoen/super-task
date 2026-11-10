/** Contrôle automatique de l'écran de revue : seule la durée est réelle (lumière / GPS reportés). */
export type LengthCheck = { ok: boolean; seconds: number; min: number | null };

export function checkVideoLength(durationSeconds: number | null | undefined, minSeconds: number | null | undefined): LengthCheck {
  const seconds = Math.max(0, Math.round(durationSeconds ?? 0));
  const min = minSeconds && minSeconds > 0 ? minSeconds : null;
  return { ok: min === null || seconds >= min, seconds, min };
}
