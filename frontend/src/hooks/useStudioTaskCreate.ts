import { useState } from "react";
import { ApiError } from "../services/api";
import { taskService } from "../services/taskService";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import type { NewTaskFormSubmitPayload } from "../components/tasks/NewTaskFormDialog";
import { resolveTaskReferenceMedia } from "../components/tasks/TaskReferenceMediaEditor";
import { ensureTaskTitle } from "../utils/ensureTaskTitle";
import { groupedCreateApiFields } from "../utils/fixedTaskCreateScope";
import { resolveTaskCompletionGuides } from "../utils/resolveTaskCompletionGuides";
import { weeklyDaysPayload } from "../utils/taskRecurrence";

type Resolved = {
  title: string;
  media: Awaited<ReturnType<typeof resolveTaskReferenceMedia>>;
  completion_requirements: Awaited<ReturnType<typeof resolveTaskCompletionGuides>>;
};

async function createFixed(payload: NewTaskFormSubmitPayload, r: Resolved, sourceGalleryItemId?: string): Promise<string> {
  const res = await taskService.createTemplate({
    ...groupedCreateApiFields(payload),
    title: r.title,
    description: payload.description,
    recurrence: payload.recurrence,
    due_time: payload.due_time,
    weekly_days: weeklyDaysPayload(payload.recurrence, payload.weekly_days),
    monthly_day: payload.recurrence === "monthly" ? payload.monthly_day : undefined,
    ops_category: payload.ops_category,
    completion_requirements: r.completion_requirements,
    is_work_start: payload.is_work_start,
    is_work_end: payload.is_work_end,
    start_url: payload.start_url,
    opened_by_delivery_note: payload.opened_by_delivery_note,
    delivery_note_task_type: payload.delivery_note_task_type,
    source_gallery_item_id: sourceGalleryItemId,
    ...r.media,
  });
  const count = res.templates?.length ?? (res.template ? 1 : 0);
  return payload.apply_to_network ? he.managerFixedTasksCreatedNetwork(count) : he.managerFixedTasksCreated;
}

async function createOnce(payload: NewTaskFormSubmitPayload, r: Resolved, sourceGalleryItemId?: string): Promise<string> {
  const res = await taskService.createAdHoc({
    ...groupedCreateApiFields(payload),
    title: r.title,
    description: payload.description,
    due_at: new Date(payload.due_at).toISOString(),
    photo_required: true,
    completion_requirements: r.completion_requirements,
    start_url: payload.start_url,
    source_gallery_item_id: sourceGalleryItemId,
    ...r.media,
  });
  const count = res.occurrences?.length ?? (res.occurrence ? 1 : 0);
  return payload.apply_to_network ? he.managerAdHocCreatedNetwork(count) : res.message;
}

function errorText(e: unknown): string {
  if (e instanceof Error && e.message === "TITLE_OR_DESCRIPTION_REQUIRED") return he.taskTitleOrDescriptionRequired;
  return e instanceof ApiError ? e.message : he.errorGeneric;
}

/**
 * Envoi du studio unique : une tâche fixe (modèle récurrent) ou « פעם אחת » (tâche ponctuelle).
 * `sourceGalleryItemId` relie la tâche au modèle de la bibliothèque dont elle vient.
 */
export function useStudioTaskCreate(onCreated: () => Promise<void> | void, sourceGalleryItemId?: string) {
  const { showError, showSuccess } = useFeedback();
  const [saving, setSaving] = useState(false);

  const submit = async (payload: NewTaskFormSubmitPayload) => {
    setSaving(true);
    try {
      const resolved: Resolved = {
        title: await ensureTaskTitle(payload.title, payload.description),
        media: await resolveTaskReferenceMedia(payload.media),
        completion_requirements: await resolveTaskCompletionGuides(payload.completion_requirements),
      };
      const create = payload.task_kind === "ad_hoc" ? createOnce : createFixed;
      showSuccess(await create(payload, resolved, sourceGalleryItemId));
      await onCreated();
    } catch (e) {
      showError(errorText(e));
      throw e;
    } finally {
      setSaving(false);
    }
  };

  return { saving, submit };
}
