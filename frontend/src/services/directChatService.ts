import api, { EMPTY_JSON_BODY } from "./api";
import { compressPhotoForUpload } from "../utils/mediaCapture";
import { uploadVideoFile } from "../utils/videoUpload";

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
  file_url?: string | null;
  file_name?: string | null;
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
  branch_id?: string | null;
  branch_name?: string | null;
  last_preview: string | null;
  last_at: string | null;
  unread_count: number;
  direct_unread_count?: number;
  task_unread_count?: number;
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
  has_more?: boolean;
  peer: { id: string; full_name: string; role: string; avatar_url?: string | null } | null;
}

export interface DirectChatPayload {
  body?: string;
  photo_url?: string;
  video_url?: string;
  audio_url?: string;
  file_url?: string;
  file_name?: string;
}

async function uploadChatFile(file: File, kind: "photo" | "video" | "audio" | "file") {
  const payload = kind === "photo" ? await compressPhotoForUpload(file) : file;
  const form = new FormData();
  form.append("file", payload);
  const { data } = await api.post<{ url: string; kind: string; filename?: string | null }>(
    `/direct-chats/upload-${kind}`,
    form,
  );
  return data;
}

/**
 * Plusieurs hooks (Layout, barre du bas, page chats) lisent la boîte en même temps,
 * chacun avec son poll et ses événements SSE : on partage l'appel en cours et on
 * garde le résultat quelques secondes, sinon Render répond 429.
 */
export const INBOX_CACHE_MS = 4_000;
/** Pause après un 429 : on resert le dernier inbox connu au lieu de rappeler. */
export const INBOX_RATE_LIMIT_COOLDOWN_MS = 30_000;

/** Résultat frais (TTL), vidé par chaque écriture ou événement entrant. */
let inboxCache: { data: DirectChatInbox; at: number } | null = null;
/** Dernière boîte reçue : survit à l'invalidation, sert pendant la pause 429. */
let lastInbox: DirectChatInbox | null = null;
let inboxInFlight: Promise<DirectChatInbox> | null = null;
let inboxCooldownUntil = 0;
let inboxRateLimitError: unknown = null;
let inboxGeneration = 0;

/**
 * Vide le cache frais. Ne lève pas la pause 429 : pendant celle-ci, on continue
 * de servir la dernière boîte connue sans rappeler le serveur.
 */
export function invalidateDirectChatInbox(): void {
  inboxCache = null;
  inboxInFlight = null;
  inboxGeneration += 1;
}

/** Tests uniquement. */
export function resetDirectChatInboxCache(): void {
  invalidateDirectChatInbox();
  lastInbox = null;
  inboxCooldownUntil = 0;
  inboxRateLimitError = null;
}

function isRateLimited(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { status?: unknown }).status === 429;
}

async function fetchInbox(): Promise<DirectChatInbox> {
  const now = Date.now();
  if (inboxCache && now - inboxCache.at < INBOX_CACHE_MS) return inboxCache.data;
  if (now < inboxCooldownUntil) {
    if (lastInbox) return lastInbox;
    throw inboxRateLimitError;
  }
  if (inboxInFlight) return inboxInFlight;

  const generation = inboxGeneration;
  const request: Promise<DirectChatInbox> = (async () => {
    try {
      const { data } = await api.get<DirectChatInbox>("/direct-chats");
      lastInbox = data;
      if (generation === inboxGeneration) inboxCache = { data, at: Date.now() };
      return data;
    } catch (error) {
      if (isRateLimited(error)) {
        inboxCooldownUntil = Date.now() + INBOX_RATE_LIMIT_COOLDOWN_MS;
        inboxRateLimitError = error;
        if (lastInbox) return lastInbox;
      }
      throw error;
    }
  })().finally(() => {
    if (inboxInFlight === request) inboxInFlight = null;
  });
  inboxInFlight = request;
  return request;
}

export const directChatService = {
  inbox: fetchInbox,
  openMine: async (scope?: "branch" | "network") => {
    const { data } = scope
      ? await api.post<DirectChatOpened>("/direct-chats/mine", EMPTY_JSON_BODY, { params: { scope } })
      : await api.post<DirectChatOpened>("/direct-chats/mine", EMPTY_JSON_BODY);
    invalidateDirectChatInbox();
    return data;
  },
  openWith: async (userId: string) => {
    const { data } = await api.post<DirectChatOpened>(`/direct-chats/with/${userId}`, EMPTY_JSON_BODY);
    invalidateDirectChatInbox();
    return data;
  },
  listMessages: async (conversationId: string, opts?: { before?: string; limit?: number }) => {
    const { data } = await api.get<{ messages: DirectChatMessage[]; has_more: boolean }>(
      `/direct-chats/${conversationId}/messages`,
      { params: { before: opts?.before, limit: opts?.limit } },
    );
    // Lire un fil le marque lu : le compteur non-lu doit se rafraîchir.
    invalidateDirectChatInbox();
    return data;
  },
  send: async (conversationId: string, payload: DirectChatPayload) => {
    const { data } = await api.post(`/direct-chats/${conversationId}/messages`, payload);
    invalidateDirectChatInbox();
    return data;
  },
  broadcast: async (payload: DirectChatPayload) => {
    const { data } = await api.post<{ ok: boolean; count: number }>("/direct-chats/broadcast", payload);
    invalidateDirectChatInbox();
    return data;
  },
  uploadPhoto: (file: File) => uploadChatFile(file, "photo"),
  uploadVideo: (file: File) => uploadVideoFile(file, "chat", (payload) => uploadChatFile(payload, "video")),
  uploadAudio: (file: File) => uploadChatFile(file, "audio"),
  uploadFile: (file: File) => uploadChatFile(file, "file"),
};
