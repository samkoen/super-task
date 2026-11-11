/** Contrôles automatiques de l'écran de revue (Figma 08). Seuls des contrôles réels sont affichés. */
import { he } from "../i18n/he";
import { locationVerdict, type CaptureLocation, type GeoPoint } from "./geoCheck";

export type LengthCheck = { ok: boolean; seconds: number; min: number | null };

export function checkVideoLength(durationSeconds: number | null | undefined, minSeconds: number | null | undefined): LengthCheck {
  const seconds = Math.max(0, Math.round(durationSeconds ?? 0));
  const min = minSeconds && minSeconds > 0 ? minSeconds : null;
  return { ok: min === null || seconds >= min, seconds, min };
}

export type ReviewCheck = {
  id: "length" | "light" | "shot";
  ok: boolean;
  /** Une vérification bloquante empêche l'envoi. */
  blocking: boolean;
  text: string;
};

export type ReviewInput = {
  durationSeconds: number | null | undefined;
  minSeconds: number | null | undefined;
  /** `null` : la lumière n'a pas pu être mesurée (caméra native), aucune ligne n'est affichée. */
  lightOk?: boolean | null;
  branch?: string | null;
  capturedAt?: string | null;
  /** GPS au tournage et coordonnées du snif : le lieu n'est affirmé que s'il est vérifié. */
  location?: CaptureLocation | null;
  branchCenter?: GeoPoint | null;
};

/** « 06:42 » à partir d'un horodatage ISO ; vide si la date est illisible. */
export function formatClockTime(iso: string | null | undefined): string {
  const date = iso ? new Date(iso) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function lengthCheck({ durationSeconds, minSeconds }: ReviewInput): ReviewCheck {
  const length = checkVideoLength(durationSeconds, minSeconds);
  const text = length.ok ? he.flowReviewLengthOk(length.seconds) : he.flowReviewTooShort(length.seconds, length.min ?? 0);
  return { id: "length", ok: length.ok, blocking: true, text };
}

/**
 * Lieu et heure. Position et coordonnées du snif connues : « au snif » ou avertissement (jamais bloquant).
 * Snif sans coordonnées : on garde le nom du snif comme avant. Position inconnue alors que le snif a des
 * coordonnées (GPS refusé) : seule l'heure est affichée, sans affirmer le lieu.
 */
function shotCheck(input: ReviewInput, time: string): ReviewCheck {
  const branch = input.branch?.trim() || null;
  const verdict = locationVerdict(input.location, input.branchCenter);
  if (verdict === "away") return { id: "shot", ok: false, blocking: false, text: he.flowReviewAwayFromBranch(time) };
  const claimBranch = verdict === "at_branch" || !input.branchCenter;
  return { id: "shot", ok: true, blocking: false, text: he.flowReviewShot(claimBranch ? branch : null, time) };
}

export function buildReviewChecks(input: ReviewInput): ReviewCheck[] {
  const checks = [lengthCheck(input)];
  if (typeof input.lightOk === "boolean") {
    checks.push({
      id: "light",
      ok: input.lightOk,
      blocking: false,
      text: input.lightOk ? he.flowReviewLightOk : he.flowReviewLightLow,
    });
  }
  const time = formatClockTime(input.capturedAt);
  if (time) checks.push(shotCheck(input, time));
  return checks;
}

export function canSendReview(checks: ReviewCheck[]): boolean {
  return checks.every((check) => check.ok || !check.blocking);
}

export function allChecksPassed(checks: ReviewCheck[]): boolean {
  return checks.every((check) => check.ok);
}
