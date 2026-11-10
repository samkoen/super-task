import { taskService } from "../services/taskService";
import { he } from "../i18n/he";
import type { ChatMessageView } from "./chatMessageView";
import {
  uploadChatMedia,
  type ChatSendPayload,
  type ChatTransport,
} from "./chatTransport";

export function asTaskChatPage(data: unknown): { messages: ChatMessageView[]; has_more: boolean } {
  if (Array.isArray(data)) return { messages: data as ChatMessageView[], has_more: false };
  if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown }).messages)) {
    const page = data as { messages: ChatMessageView[]; has_more?: boolean };
    return { messages: page.messages, has_more: Boolean(page.has_more) };
  }
  return { messages: [], has_more: false };
}

export function createTaskChatTransport(opts: {
  occurrenceId: string;
  onPosted?: (status: string, notice?: string) => void;
  /** Étape choisie au moment de l'envoi (FLOW 1) ; null/absent = général. */
  getSlotIndex?: () => number | null;
}): ChatTransport {
  return {
    list: async (before) => asTaskChatPage(await taskService.listMessages(opts.occurrenceId, { before })),
    send: async (payload) => postTaskChat(opts.occurrenceId, withSlot(payload, opts.getSlotIndex?.()), opts.onPosted),
    upload: (file, kind) => uploadChatMedia(taskService, file, kind),
  };
}

export function withSlot(payload: ChatSendPayload, slotIndex: number | null | undefined): ChatSendPayload {
  return typeof slotIndex === "number" ? { ...payload, slot_index: slotIndex } : payload;
}

async function postTaskChat(
  occurrenceId: string,
  payload: ChatSendPayload,
  onPosted?: (status: string, notice?: string) => void,
) {
  const result = await taskService.postMessage(occurrenceId, payload);
  onPosted?.(result.occurrence.status, he.taskChatSent);
  return { breakFrom: result };
}
