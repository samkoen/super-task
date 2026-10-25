import api from "./api";
import { asList } from "../utils/asList";
import type { CompletionRequirement } from "../utils/completionMedia";
import type { OpsCategory, TaskRecurrence } from "./taskService";

/** Champs qu'un snif peut adapter pour lui seul (valeurs possibles de `overridden_fields`). */
export type FixedOverrideField =
  | "due_time"
  | "weekly_days"
  | "is_active"
  | "description"
  | "reference_media"
  | "start_url";

export interface FixedTaskBranch {
  template_id: string;
  branch_id: string;
  branch_name: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  due_time: string;
  weekly_days: string | null;
  is_active: boolean;
  description: string | null;
  start_url: string | null;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  overridden_fields: FixedOverrideField[];
  opened_by_delivery_note: boolean;
}

/** Une tâche fixe vue dans son ensemble : réglages généraux + une ligne par snif. */
export interface FixedTaskGroup {
  key: string;
  network_group_id: string | null;
  is_network: boolean;
  can_edit_defaults: boolean;
  title: string;
  description: string;
  recurrence: TaskRecurrence;
  due_time: string;
  weekly_days: string | null;
  monthly_day: number | null;
  is_active: boolean;
  ops_category?: OpsCategory | null;
  photo_required?: boolean;
  min_video_seconds?: number | null;
  completion_requirements?: CompletionRequirement[];
  is_work_start?: boolean;
  is_work_end?: boolean;
  start_url?: string | null;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  opened_by_delivery_note?: boolean;
  delivery_note_task_type?: string | null;
  branches: FixedTaskBranch[];
  template_ids: string[];
  branch_count: number;
  active_count: number;
  overridden_count: number;
  unassigned_count: number;
}

export interface FixedTaskDefaultsPayload {
  title: string;
  description: string;
  due_time: string;
  weekly_days?: string | null;
  is_active: boolean;
  assignee_user_id?: string;
  ops_category?: OpsCategory | null;
  completion_requirements?: CompletionRequirement[];
  is_work_start?: boolean;
  is_work_end?: boolean;
  start_url?: string | null;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
}

/** Valeurs posées pour un snif (clés = attributs de la tâche). */
export type FixedBranchChanges = Partial<{
  assignee_user_id: string;
  due_time: string;
  weekly_days: string | null;
  is_active: boolean;
  description: string;
  start_url: string | null;
}>;

export const fixedTaskService = {
  list: async (branchId?: string) => {
    const params = branchId ? { branch_id: branchId } : undefined;
    const response = await api.get<FixedTaskGroup[]>("/fixed-tasks", { params });
    return asList<FixedTaskGroup>(response.data);
  },

  get: async (key: string) => {
    const response = await api.get<FixedTaskGroup>(`/fixed-tasks/${key}`);
    return response.data;
  },

  updateDefaults: async (key: string, payload: FixedTaskDefaultsPayload) => {
    const response = await api.patch<FixedTaskGroup>(`/fixed-tasks/${key}/defaults`, payload);
    return response.data;
  },

  updateBranch: async (
    templateId: string,
    body: { changes?: FixedBranchChanges; reset?: FixedOverrideField[] },
  ) => {
    const response = await api.patch<FixedTaskBranch>(`/fixed-tasks/branches/${templateId}`, body);
    return response.data;
  },
};
