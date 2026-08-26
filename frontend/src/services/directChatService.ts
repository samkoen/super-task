import api from "./api";

export interface DirectChatMessage {
  id: string;
  conversation_id: string;
  sender_user_id: string;
  sender_name?: string | null;
  sender_role?: string | null;
  body: string | null;
  photo_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  created_at: string;
}

export interface DirectChatCard {
  id: string | null;
  kind: "down" | "up";
  scope?: "branch" | "network" | null;
  counterpart_user_id: string;
  counterpart_name: string;
  counterpart_avatar_url?: string | null;
  counterpart_role: string;
  last_preview: string | null;
  last_at: string | null;
  unread_count: number;
}

export interface DirectChatInbox {
  items: DirectChatCard[];
  up: DirectChatCard | null;
  unread_count: number;
  managers?: DirectChatCard[];
  manages_all_workers?: boolean;
}

export interface DirectChatOpened {
  conversation: { id: string };
  messages: DirectChatMessage[];
  peer: { id: string; full_name: string; role: string; avatar_url?: string | null } | null;
}

export interface DirectChatPayload {
  body?: string;
  photo_url?: string;
  video_url?: string;
  audio_url?: string;
}

async function uploadChatFile(file: File, kind: "photo" | "video" | "audio") {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<{ url: string; kind: string }>(`/direct-chats/upload-${kind}`, form);
  return data;
}

export const directChatService = {
  inbox: async () => {
    const { data } = await api.get<DirectChatInbox>("/direct-chats");
    return data;
  },
  openMine: async (scope?: "branch" | "network") => {
    const { data } = scope
      ? await api.post<DirectChatOpened>("/direct-chats/mine", undefined, { params: { scope } })
      : await api.post<DirectChatOpened>("/direct-chats/mine");
    return data;
  },
  openWith: async (userId: string) => {
    const { data } = await api.post<DirectChatOpened>(`/direct-chats/with/${userId}`);
    return data;
  },
  listMessages: async (conversationId: string) => {
    const { data } = await api.get<{ messages: DirectChatMessage[] }>(
      `/direct-chats/${conversationId}/messages`,
    );
    return data.messages;
  },
  send: async (conversationId: string, payload: DirectChatPayload) => {
    const { data } = await api.post(`/direct-chats/${conversationId}/messages`, payload);
    return data;
  },
  broadcast: async (payload: DirectChatPayload) => {
    const { data } = await api.post<{ ok: boolean; count: number }>("/direct-chats/broadcast", payload);
    return data;
  },
  uploadPhoto: (file: File) => uploadChatFile(file, "photo"),
  uploadVideo: (file: File) => uploadChatFile(file, "video"),
  uploadAudio: (file: File) => uploadChatFile(file, "audio"),
};
