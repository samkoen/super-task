/** Revue menahel plein écran (Figma « Menahel · בדיקת משימה ») : file, sous-titre, contrôles réels. */
import { he } from "../i18n/he";
import type { TaskOccurrence } from "../services/taskService";
import type { CompletionAttachment } from "./completionMedia";
import { buildReviewChecks, formatClockTime, type ReviewCheck } from "./flowReview";
import type { InboxItem } from "./managerHome";

export type ReviewQueueEntry = { id: string; title: string };

/** Les preuves à valider de « לטיפולך », dans l'ordre affiché. */
export function reviewQueueFromInbox(items: InboxItem[]): ReviewQueueEntry[] {
  return items
    .filter((item) => item.kind === "review" && item.taskId)
    .map((item) => ({ id: item.taskId as string, title: item.title }));
}

export type QueuePosition = { index: number; total: number; next: ReviewQueueEntry | null };

/**
 * Position de la tâche ouverte dans la file. Les tâches déjà tranchées sont sautées pour « הבא בתור ».
 * Une tâche absente de la file (ouverte d'ailleurs) compte comme une file d'une seule carte.
 */
export function queuePosition(queue: ReviewQueueEntry[], currentId: string, decided: string[] = []): QueuePosition {
  const at = queue.findIndex((entry) => entry.id === currentId);
  if (at < 0) return { index: 1, total: 1, next: null };
  const after = [...queue.slice(at + 1), ...queue.slice(0, at)];
  const next = after.find((entry) => !decided.includes(entry.id)) ?? null;
  return { index: at + 1, total: queue.length, next };
}

/** « דני · מחסן · נשלח 06:47 » : seulement les morceaux connus. */
export function reviewSubtitle(task: TaskOccurrence): string {
  const time = formatClockTime(task.completion?.completed_at);
  const parts = [task.assignee_name?.trim(), task.department_name?.trim(), time ? he.managerReviewSentAt(time) : ""];
  return parts.filter(Boolean).join(" · ");
}

function firstVisual(attachments: CompletionAttachment[] | undefined): CompletionAttachment | null {
  const visible = (attachments ?? []).filter((item) => !item.skipped && item.url);
  return visible.find((item) => item.kind === "video") ?? visible.find((item) => item.kind === "photo") ?? null;
}

/**
 * Contrôles automatiques réels : durée (vidéo seulement) et heure du tournage.
 * Rien n'est inventé : sans vidéo ni horodatage, la liste est vide et la carte n'est pas affichée.
 */
export function managerReviewChecks(task: TaskOccurrence): ReviewCheck[] {
  const media = firstVisual(task.completion?.completion_attachments);
  if (!media) return [];
  const checks = buildReviewChecks({
    durationSeconds: media.duration_seconds,
    minSeconds: task.min_video_seconds,
    // Sans coordonnées du snif on ne peut pas vérifier le lieu : seule l'heure est affirmée.
    branch: null,
    capturedAt: media.captured_at,
    location: media.location ?? null,
    branchCenter: null,
  });
  return media.kind === "video" ? checks : checks.filter((check) => check.id !== "length");
}
