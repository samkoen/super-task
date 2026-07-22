import type { EmployeeTaskCard } from "../services/dashboardService";
import type { TaskOccurrence } from "../services/taskService";

/** Adaptateur dashboard oved → modèle carte partagée (TaskOccurrenceCard). */
export function employeeCardToOccurrence(card: EmployeeTaskCard): TaskOccurrence {
  return {
    id: card.id,
    template_id: null,
    branch_id: "",
    title: card.title,
    description: card.description ?? "",
    due_at: card.due_at,
    status: card.status,
    assignee_user_id: null,
    department_id: null,
    task_kind: card.task_kind,
    manager_user_id: null,
    photo_required: card.photo_required,
    reference_photo_url: card.reference_photo_url,
    reference_video_url: card.reference_video_url,
    reference_audio_url: card.reference_audio_url,
    started_at: card.started_at,
    created_at: card.created_at ?? card.due_at,
    updated_at: card.created_at ?? card.due_at,
    department_name: card.department_name,
    completion: card.completion ?? null,
    spoken_text: card.spoken_text,
    display_language: card.display_language,
    title_he: card.title_he,
    translation_pending: card.translation_pending,
    manager_next_at: card.manager_next_at,
    is_manager_next: card.is_manager_next,
  };
}

export function showsHebrewTitle(task: {
  title?: string;
  title_he?: string | null;
  display_language?: string | null;
}): boolean {
  return Boolean(
    task.title_he &&
      task.title_he !== task.title &&
      task.display_language &&
      task.display_language !== "he",
  );
}
