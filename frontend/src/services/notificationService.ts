import api from "./api";

export interface AppNotification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  message: string;
  occurrence_id: string | null;
  branch_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const notificationService = {
  list: async (unreadOnly = false) => {
    const response = await api.get<{ items: AppNotification[]; unread_count: number }>(
      "/notifications",
      { params: unreadOnly ? { unread_only: true } : undefined }
    );
    return response.data;
  },

  markRead: async (notificationId: string) => {
    const response = await api.post<{ notification: AppNotification }>(
      `/notifications/${notificationId}/read`
    );
    return response.data.notification;
  },

  markAllRead: async () => {
    const response = await api.post<{ marked: number }>("/notifications/read-all");
    return response.data.marked;
  },
};
