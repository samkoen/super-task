import { directChatService } from "../services/directChatService";
import {
  uploadChatMedia,
  type ChatSendPayload,
  type ChatTransport,
} from "./chatTransport";

export function createDirectChatTransport(opts: {
  conversationId: string | null;
  broadcast?: boolean;
  onSent?: () => void;
}): ChatTransport {
  return {
    list: async (before) => {
      if (!opts.conversationId) return { messages: [], has_more: false };
      return directChatService.listMessages(opts.conversationId, { before });
    },
    send: (payload) => deliverDirectChat(opts, payload),
    upload: (file, kind) => uploadChatMedia(directChatService, file, kind),
  };
}

async function deliverDirectChat(
  opts: { conversationId: string | null; broadcast?: boolean; onSent?: () => void },
  payload: ChatSendPayload,
) {
  if (opts.broadcast) {
    await directChatService.broadcast(payload);
    opts.onSent?.();
    return {};
  }
  if (!opts.conversationId) return {};
  const sent = await directChatService.send(opts.conversationId, payload);
  opts.onSent?.();
  return { breakFrom: sent };
}
