/**
 * Studio unique (étape 5) : la même création pour une tâche fixe et une tâche « פעם אחת ».
 * Seule la section « מתי » change ; une tâche « פעם אחת » part en tâche ponctuelle (ad hoc).
 */
import type { NewTaskFormSubmitPayload } from "../components/tasks/NewTaskFormDialog";
import type { TaskGalleryItem } from "../services/taskGalleryService";
import { he } from "../i18n/he";
import { normalizeRequirements } from "./completionMedia";
import { datetimeLocalForNewTask, formatHebrewDayShort, todayIso } from "./dateView";
import { wizardPayload, type WizardContext, type WizardForm } from "./fixedTaskWizard";
import type { AdHocTaskPrefillFromIssue } from "./issueReportTaskPrefill";
import { normalizeFixedRecurrence } from "./taskRecurrence";

export function isOnce(form: Pick<WizardForm, "taskKind">): boolean {
  return form.taskKind === "ad_hoc";
}

/** « פעם אחת » : aujourd'hui, à la prochaine heure utile. */
export function onceDefaults(dayIso = todayIso(), now = new Date()): Partial<WizardForm> {
  return { taskKind: "ad_hoc", dueAt: datetimeLocalForNewTask(dayIso, now) };
}

/** Sépare « YYYY-MM-DDTHH:mm » en date et heure (vides si la valeur est incomplète). */
export function splitDueAt(dueAt: string): { date: string; time: string } {
  const [date = "", time = ""] = dueAt.split("T");
  return { date, time: time.slice(0, 5) };
}

export function joinDueAt(date: string, time: string): string {
  return date && time ? `${date}T${time}` : date ? `${date}T` : "";
}

/** Ligne sous le titre : « יום ב׳ 16.11 · בשעה 9:00 » pour « פעם אחת ». */
export function onceScheduleLine(dueAt: string): string {
  const { date, time } = splitDueAt(dueAt);
  return [date ? formatHebrewDayShort(date) : "", time ? he.flowDueAtHour(time) : ""].filter(Boolean).join(" · ");
}

/** Blocage propre à « פעם אחת » : une date et une heure complètes. */
export function onceBlocker(form: WizardForm): string {
  if (!isOnce(form)) return "";
  const { date, time } = splitDueAt(form.dueAt);
  return date && time ? "" : he.studioNeedDueAt;
}

/** Charge envoyée : celle de la tâche fixe, ou une tâche ponctuelle avec sa date. */
export function studioPayload(form: WizardForm, ctx: WizardContext): NewTaskFormSubmitPayload {
  const payload = wizardPayload(form, ctx);
  if (!isOnce(form)) return payload;
  return { ...payload, task_kind: "ad_hoc", due_at: form.dueAt, opened_by_delivery_note: false, delivery_note_task_type: null };
}

/** Modèle de la bibliothèque : contenu repris, « פעם אחת » ou récurrence selon le modèle. */
export function formFromGalleryItem(item: TaskGalleryItem, dayIso = todayIso()): Partial<WizardForm> {
  const content: Partial<WizardForm> = {
    title: item.title,
    description: item.description ?? "",
    completionRequirements: normalizeRequirements(item.completion_requirements),
    startUrl: item.start_url ?? "",
    media: {
      reference_photo_url: item.reference_photo_url ?? "",
      reference_video_url: item.reference_video_url ?? "",
      reference_audio_url: item.reference_audio_url ?? "",
    },
  };
  if (item.task_kind !== "fixed") return { ...content, ...onceDefaults(dayIso) };
  return {
    ...content,
    taskKind: "fixed",
    recurrence: normalizeFixedRecurrence(item.recurrence),
    dueTime: item.due_time || "09:00",
    ...(item.weekly_days ? { weeklyDays: item.weekly_days } : {}),
    ...(item.monthly_day ? { monthlyDay: item.monthly_day } : {}),
  };
}

/** Signalement transformé en tâche : contenu et oved du signalement, « פעם אחת ». */
export function formFromIssue(prefill: AdHocTaskPrefillFromIssue, dayIso = todayIso()): Partial<WizardForm> {
  return {
    ...onceDefaults(dayIso),
    branchId: prefill.branch_id,
    // Menahel réseau : seul le snif du signalement, avec l'oved du signalement.
    selectedBranchIds: [prefill.branch_id],
    branchesTouched: true,
    branchChoices: prefill.assignee_user_id ? { [prefill.branch_id]: prefill.assignee_user_id } : {},
    title: prefill.title,
    description: prefill.description,
    assigneeUserId: prefill.assignee_user_id,
    media: {
      reference_photo_url: prefill.reference_photo_url,
      reference_video_url: prefill.reference_video_url,
      reference_audio_url: prefill.reference_audio_url,
    },
  };
}

/** Menahel réseau arrivé depuis un snif précis : la tâche vise ce snif par défaut. */
export function formForScopeBranch(branchId: string | null | undefined): Partial<WizardForm> {
  return branchId ? { selectedBranchIds: [branchId], branchesTouched: true } : {};
}
