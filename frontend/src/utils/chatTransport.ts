import { ApiError } from "../services/api";
import { he } from "../i18n/he";
import type { MediaKind } from "../components/media/MediaCaptureActions";
import type { ChatMessageView } from "./chatMessageView";

export type ChatMediaKind = MediaKind | "file";

export type ChatSendPayload = {
  body?: string;
  photo_url?: string;
  video_url?: string;
  audio_url?: string;
  file_url?: string;
  file_name?: string;
};

export type ChatSendResult = {
  breakFrom?: unknown;
};

export type ChatTransport = {
  list: (before?: string) => Promise<{ messages: ChatMessageView[]; has_more: boolean }>;
  send: (payload: ChatSendPayload) => Promise<ChatSendResult>;
  upload: (file: File, kind: ChatMediaKind) => Promise<ChatSendPayload>;
};

type MediaUploader = {
  uploadPhoto: (file: File) => Promise<{ url: string }>;
  uploadVideo: (file: File) => Promise<{ url: string }>;
  uploadAudio: (file: File) => Promise<{ url: string }>;
  uploadFile: (file: File) => Promise<{ url: string; filename?: string | null }>;
};

export function chatErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : he.errorGeneric;
}

export async function uploadChatMedia(
  uploader: MediaUploader,
  file: File,
  kind: ChatMediaKind,
): Promise<ChatSendPayload> {
  if (kind === "photo") return { photo_url: (await uploader.uploadPhoto(file)).url };
  if (kind === "video") return { video_url: (await uploader.uploadVideo(file)).url };
  if (kind === "audio") return { audio_url: (await uploader.uploadAudio(file)).url };
  const uploaded = await uploader.uploadFile(file);
  return { file_url: uploaded.url, file_name: uploaded.filename || file.name };
}
