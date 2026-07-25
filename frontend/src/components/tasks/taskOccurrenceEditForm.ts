import { taskGalleryService } from "../../services/taskGalleryService";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { isAssignToGallery } from "../../constants/taskAssignment";
import { he } from "../../i18n/he";
import { toDatetimeLocal } from "../../utils/dateView";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "./TaskReferenceMediaEditor";

export type OccurrenceEditForm = {
  title: string;
  description: string;
  due_at: string;
  assignee_user_id: string;
  photo_required: boolean;
} & TaskReferenceMediaValue;

export function emptyOccurrenceEditForm(): OccurrenceEditForm {
  return {
    title: "",
    description: "",
    due_at: "",
    assignee_user_id: "",
    photo_required: true,
    reference_photo_url: "",
    reference_video_url: "",
    reference_audio_url: "",
    pending_photo: null,
    pending_video: null,
  };
}

export function formFromOccurrence(fresh: TaskOccurrence): OccurrenceEditForm {
  return {
    title: fresh.title,
    description: fresh.description,
    due_at: toDatetimeLocal(fresh.due_at),
    assignee_user_id: fresh.assignee_user_id ?? "",
    photo_required: fresh.photo_required,
    reference_photo_url: fresh.reference_photo_url ?? "",
    reference_video_url: fresh.reference_video_url ?? "",
    reference_audio_url: fresh.reference_audio_url ?? "",
    pending_photo: null,
    pending_video: null,
  };
}

export async function saveOccurrenceEdit(
  target: TaskOccurrence,
  form: OccurrenceEditForm,
  mediaDirty: boolean,
): Promise<string> {
  const moveToGallery = isAssignToGallery(form.assignee_user_id);
  const payload: Parameters<typeof taskService.updateOccurrence>[1] = {
    title: form.title.trim(),
    description: form.description,
    due_at: new Date(form.due_at).toISOString(),
    assignee_user_id: moveToGallery
      ? target.assignee_user_id || undefined
      : form.assignee_user_id || undefined,
    photo_required: target.task_kind === "ad_hoc" ? form.photo_required : undefined,
  };
  if (mediaDirty) {
    const media = await resolveTaskReferenceMedia(form);
    payload.reference_photo_url = media.reference_photo_url || null;
    payload.reference_video_url = media.reference_video_url || null;
    payload.reference_audio_url = media.reference_audio_url || null;
  }
  await taskService.updateOccurrence(target.id, payload);
  if (!moveToGallery) return he.taskUpdated;
  await taskGalleryService.createFromOccurrence(target.id);
  await taskService.cancel(target.id);
  return he.taskMovedToGallery;
}
