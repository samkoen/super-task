export type ChatMessageView = {
  id: string;
  sender_user_id: string;
  sender_name?: string | null;
  sender_role?: string | null;
  body?: string | null;
  display_body?: string | null;
  photo_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  audio_transcript?: string | null;
  display_audio_transcript?: string | null;
  created_at: string;
};

export function chatMessageText(msg: ChatMessageView): string {
  return (msg.display_body ?? msg.body ?? "").trim();
}

export function chatMessageTranscript(msg: ChatMessageView): string | undefined {
  if (chatMessageText(msg)) return undefined;
  return (msg.display_audio_transcript ?? msg.audio_transcript)?.trim() || undefined;
}

export function isEmployeeChatMessage(msg: ChatMessageView, mine: boolean): boolean {
  return msg.sender_role === "employee" || (!mine && !msg.sender_role);
}

export function lastEmployeeChatMessage(messages: ChatMessageView[]): ChatMessageView | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].sender_role === "employee") return messages[i];
  }
  return undefined;
}

export type ChatMessageListSx = {
  overflowY: "auto";
  display: "flex";
  flexDirection: "column";
  gap: number;
  p: number;
  bgcolor: string;
  borderRadius: number;
  flex?: number;
  minHeight?: number;
  maxHeight?: number;
  border?: string;
  borderColor?: string;
};

export function chatMessageListSx(layout: "fill" | "bounded", compact: boolean): ChatMessageListSx {
  const base = {
    overflowY: "auto" as const,
    display: "flex" as const,
    flexDirection: "column" as const,
    gap: 1,
    p: 1.25,
    bgcolor: "grey.100",
    borderRadius: 2,
  };
  if (layout === "fill") {
    return { ...base, flex: 1, minHeight: 220 };
  }
  return {
    ...base,
    maxHeight: compact ? 220 : 320,
    border: "1px solid",
    borderColor: "divider",
  };
}
