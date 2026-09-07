export const CHAT_CAPTION_MAX = 2000;

export function canAnnotateChatReply(composeEnabled: boolean, mine: boolean): boolean {
  return composeEnabled && !mine;
}

export function clipChatCaption(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  return text.length > CHAT_CAPTION_MAX ? text.slice(0, CHAT_CAPTION_MAX) : text;
}
