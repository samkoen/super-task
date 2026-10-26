import { useEffect, useState } from "react";
import { ApiError } from "../services/api";
import { taskService } from "../services/taskService";
import { useFeedback } from "../context/FeedbackContext";
import { he } from "../i18n/he";
import type { NewTaskFormSubmitPayload } from "../components/tasks/NewTaskFormDialog";
import { resolveTaskReferenceMedia } from "../components/tasks/TaskReferenceMediaEditor";
import { groupedCreateApiFields } from "../utils/fixedTaskCreateScope";
import {
  MANAGER_FIXED_TASKS_DRAFT_KEY,
  readFixedTaskCreateDraft,
  setFixedTaskCreateOpen,
} from "../utils/fixedTaskScreenDraft";
import { resolveTaskCompletionGuides } from "../utils/resolveTaskCompletionGuides";
import { weeklyDaysPayload } from "../utils/taskRecurrence";

/** Création d'une tâche fixe : état d'ouverture du formulaire (brouillon conservé) + envoi. */
export function useFixedTaskCreate(onCreated: () => Promise<void>) {
  const { showError, showSuccess } = useFeedback();
  const [open, setOpen] = useState(
    () => readFixedTaskCreateDraft(MANAGER_FIXED_TASKS_DRAFT_KEY)?.open ?? false,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFixedTaskCreateOpen(MANAGER_FIXED_TASKS_DRAFT_KEY, open);
  }, [open]);

  const submit = async (payload: NewTaskFormSubmitPayload) => {
    setSaving(true);
    try {
      const media = await resolveTaskReferenceMedia(payload.media);
      const completion_requirements = await resolveTaskCompletionGuides(payload.completion_requirements);
      const res = await taskService.createTemplate({
        ...groupedCreateApiFields(payload),
        title: payload.title,
        description: payload.description,
        recurrence: payload.recurrence,
        due_time: payload.due_time,
        weekly_days: weeklyDaysPayload(payload.recurrence, payload.weekly_days),
        monthly_day: payload.monthly_day,
        ops_category: payload.ops_category,
        completion_requirements,
        is_work_start: payload.is_work_start,
        is_work_end: payload.is_work_end,
        start_url: payload.start_url,
        opened_by_delivery_note: payload.opened_by_delivery_note,
        delivery_note_task_type: payload.delivery_note_task_type,
        ...media,
      });
      setOpen(false);
      const count = res.templates?.length ?? (res.template ? 1 : 0);
      showSuccess(payload.apply_to_network ? he.managerFixedTasksCreatedNetwork(count) : he.managerFixedTasksCreated);
      await onCreated();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  return { open, setOpen, saving, submit };
}
