import type { CompletionRequirement } from "./completionMedia";
import { pendingSlotIsFilled, type PendingMedia } from "./pendingMedia";

export type CaptureStepState = "done" | "next" | "todo";

export type CaptureProgress = {
  states: CaptureStepState[];
  done: number;
  total: number;
  remaining: number;
  /** Index du premier pas à faire, -1 si tout est prêt. */
  nextIndex: number;
};

/** État de chaque pas : fait, prochain à faire (un seul, mis en avant), ou à faire plus tard. */
export function captureProgress(
  requirements: CompletionRequirement[],
  slots: Array<PendingMedia | null | undefined>,
): CaptureProgress {
  const filled = requirements.map((_, index) => pendingSlotIsFilled(slots[index]));
  const nextIndex = filled.indexOf(false);
  const states = filled.map<CaptureStepState>((isDone, index) =>
    isDone ? "done" : index === nextIndex ? "next" : "todo",
  );
  const done = filled.filter(Boolean).length;
  return { states, done, total: requirements.length, remaining: requirements.length - done, nextIndex };
}

export type VideoRecordingProgress = {
  /** Secondes restantes avant le minimum requis (0 si atteint ou sans minimum). */
  remaining: number;
  /** 0..1, toujours 1 sans minimum. */
  ratio: number;
  reached: boolean;
};

/** Avancement vers la durée minimale d'une vidéo en cours d'enregistrement. */
export function videoRecordingProgress(
  elapsedSeconds: number,
  minSeconds?: number | null,
): VideoRecordingProgress {
  const elapsed = Math.max(0, Math.floor(elapsedSeconds));
  if (!minSeconds || minSeconds <= 0) return { remaining: 0, ratio: 1, reached: true };
  const remaining = Math.max(0, minSeconds - elapsed);
  return { remaining, ratio: Math.min(1, elapsed / minSeconds), reached: remaining === 0 };
}

/** Chronomètre « 01:07 » pour une vidéo ou un message vocal. */
export function formatRecordingClock(elapsedSeconds: number): string {
  const total = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = String(Math.floor(total / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}
