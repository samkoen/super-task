import api from "./api";

export type GalleryTaskKind = "fixed" | "ad_hoc";

export interface TaskGalleryItem {
  id: string;
  network_id: string;
  branch_id: string | null;
  title: string;
  description: string;
  task_kind: GalleryTaskKind;
  recurrence: string | null;
  due_time: string | null;
  weekly_days: string | null;
  monthly_day: number | null;
  photo_required: boolean;
  reference_photo_url: string | null;
  reference_video_url: string | null;
  reference_audio_url: string | null;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface TaskGalleryPayload {
  network_id?: string;
  branch_id?: string | null;
  title: string;
  description?: string;
  task_kind: GalleryTaskKind;
  recurrence?: string | null;
  due_time?: string | null;
  weekly_days?: string | null;
  monthly_day?: number | null;
  photo_required?: boolean;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
}

export const taskGalleryService = {
  list: async (taskKind?: GalleryTaskKind) => {
    const params = taskKind ? { task_kind: taskKind } : undefined;
    const response = await api.get<{ items: TaskGalleryItem[] }>("/task-gallery", { params });
    return response.data.items;
  },

  create: async (payload: TaskGalleryPayload) => {
    const response = await api.post<{ item: TaskGalleryItem; message: string }>(
      "/task-gallery",
      payload,
    );
    return response.data;
  },

  update: async (id: string, payload: TaskGalleryPayload) => {
    const response = await api.patch<{ item: TaskGalleryItem; message: string }>(
      `/task-gallery/${id}`,
      payload,
    );
    return response.data;
  },

  delete: async (id: string) => {
    const response = await api.delete<{ ok: boolean; message: string }>(`/task-gallery/${id}`);
    return response.data;
  },

  createFromOccurrence: async (occurrenceId: string) => {
    const response = await api.post<{ item: TaskGalleryItem; message: string }>(
      `/task-gallery/from-occurrence/${occurrenceId}`,
    );
    return response.data;
  },

  createFromTemplate: async (templateId: string) => {
    const response = await api.post<{ item: TaskGalleryItem; message: string }>(
      `/task-gallery/from-template/${templateId}`,
    );
    return response.data;
  },
};
