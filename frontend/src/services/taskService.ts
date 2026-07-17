import api from "./api";

export type TaskRecurrence = "daily" | "weekly" | "biweekly" | "monthly";
export type TaskKind = "fixed" | "ad_hoc";
export type TaskStatus = "pending" | "in_progress" | "pending_review" | "completed" | "overdue" | "cancelled";
export type CompletionStatus = "completed" | "not_completed";
export type ManagerReviewStatus = "pending" | "approved" | "rejected";

export interface TaskTemplate {
  id: string;
  branch_id: string;
  title: string;
  description: string;
  recurrence: TaskRecurrence;
  due_time: string;
  weekly_days: string | null;
  monthly_day: number | null;
  assignee_user_id: string | null;
  department_id: string | null;
  task_kind: TaskKind;
  photo_required: boolean;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  is_active: boolean;
  created_by_id: string;
  created_at: string;
  updated_at: string;
  branch_name?: string | null;
  department_name?: string | null;
}

export interface TaskCompletion {
  id: string;
  occurrence_id: string;
  status: CompletionStatus;
  note: string | null;
  photo_path: string | null;
  video_path: string | null;
  audio_path: string | null;
  audio_transcript?: string | null;
  audio_transcript_employee?: string | null;
  not_completed_reason: string | null;
  completed_by_id: string;
  completed_at: string;
  manager_review_status?: ManagerReviewStatus | null;
  manager_reviewed_by_id?: string | null;
  manager_reviewed_at?: string | null;
  rejection_note?: string | null;
}

export interface TaskOccurrence {
  id: string;
  template_id: string | null;
  branch_id: string;
  title: string;
  description: string;
  due_at: string;
  status: TaskStatus;
  assignee_user_id: string | null;
  department_id: string | null;
  task_kind: TaskKind;
  manager_user_id: string | null;
  photo_required: boolean;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  started_at: string | null;
  pending_delegation?: boolean;
  created_at: string;
  updated_at: string;
  branch_name?: string | null;
  department_name?: string | null;
  assignee_name?: string | null;
  manager_name?: string | null;
  spoken_text?: string;
  display_language?: string;
  completion?: TaskCompletion | null;
}

export interface CreateTaskTemplatePayload {
  branch_id: string;
  title: string;
  description?: string;
  recurrence: TaskRecurrence;
  due_time?: string;
  weekly_days?: string;
  monthly_day?: number;
  assignee_user_id: string;
  reference_photo_url?: string;
  reference_video_url?: string;
  reference_audio_url?: string;
}

export interface CreateAdHocPayload {
  branch_id: string;
  title: string;
  description?: string;
  due_at: string;
  assignee_user_id?: string;
  photo_required?: boolean;
  reference_photo_url?: string;
  reference_video_url?: string;
  reference_audio_url?: string;
}

export interface CompleteTaskPayload {
  status: CompletionStatus;
  note?: string;
  photo_path?: string;
  video_path?: string;
  audio_path?: string;
  not_completed_reason?: string;
}

async function uploadTaskFile(file: File, kind: "photo" | "video" | "audio") {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<{ url: string; kind: string }>(`/tasks/upload-${kind}`, form);
  return response.data;
}

export interface TaskTranslation {
  id: string;
  title: string;
  description: string;
  spoken_text: string;
  display_language: string;
  translation_pending?: boolean;
  title_he?: string;
}

export const taskService = {
  listTemplates: async (branchId?: string) => {
    const params = branchId ? { branch_id: branchId } : undefined;
    const response = await api.get<TaskTemplate[]>("/tasks/templates", { params });
    return response.data;
  },

  createTemplate: async (payload: CreateTaskTemplatePayload) => {
    const response = await api.post<{ message: string; template: TaskTemplate }>(
      "/tasks/templates",
      payload
    );
    return response.data;
  },

  createAdHoc: async (payload: CreateAdHocPayload) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      "/tasks/ad-hoc",
      payload
    );
    return response.data;
  },

  listOccurrences: async (params?: {
    branch_id?: string;
    status?: TaskStatus;
    due_on?: string;
    due_from?: string;
    due_to?: string;
    pending_delegation?: boolean;
    task_kind?: TaskKind;
  }) => {
    const response = await api.get<TaskOccurrence[]>("/tasks/occurrences", { params });
    return response.data;
  },

  getOccurrence: async (occurrenceId: string) => {
    const response = await api.get<TaskOccurrence>(`/tasks/occurrences/${occurrenceId}`);
    return response.data;
  },

  listMine: async (params?: { due_on?: string; due_from?: string; due_to?: string }) => {
    const response = await api.get<TaskOccurrence[]>("/tasks/mine", { params });
    return response.data;
  },

  translateMine: async (occurrenceIds: string[]) => {
    const response = await api.post<{ translations: TaskTranslation[] }>(
      "/tasks/mine/translate",
      { occurrence_ids: occurrenceIds },
      { timeout: 180_000 }
    );
    return response.data.translations;
  },

  start: async (occurrenceId: string) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/start`
    );
    return response.data;
  },

  delegate: async (occurrenceId: string, assigneeUserId: string) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/delegate`,
      { assignee_user_id: assigneeUserId }
    );
    return response.data;
  },

  complete: async (occurrenceId: string, payload: CompleteTaskPayload) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/complete`,
      payload
    );
    return response.data;
  },

  approve: async (occurrenceId: string) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/approve`
    );
    return response.data;
  },

  reopen: async (occurrenceId: string, payload?: { rejection_note?: string }) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/reopen`,
      payload ?? {}
    );
    return response.data;
  },

  cancel: async (occurrenceId: string) => {
    const response = await api.post<{
      message: string;
      occurrence: TaskOccurrence;
      deleted?: boolean;
    }>(`/tasks/occurrences/${occurrenceId}/cancel`);
    return response.data;
  },

  updateOccurrence: async (
    occurrenceId: string,
    payload: {
      title: string;
      description?: string;
      due_at: string;
      assignee_user_id?: string;
      photo_required?: boolean;
      reference_photo_url?: string | null;
      reference_video_url?: string | null;
      reference_audio_url?: string | null;
    }
  ) => {
    const response = await api.post<{ message: string; occurrence: TaskOccurrence }>(
      `/tasks/occurrences/${occurrenceId}/update`,
      payload
    );
    return response.data;
  },

  uploadPhoto: async (file: File) => uploadTaskFile(file, "photo"),

  uploadVideo: async (file: File) => uploadTaskFile(file, "video"),

  uploadAudio: async (file: File) => uploadTaskFile(file, "audio"),
};
