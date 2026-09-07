import type { ChatSendPayload } from "./chatTransport";

const MAX_PREVIEWS = 12;
const previews = new Map<string, string>();
const order: string[] = [];

export function rememberChatMediaPreview(payload: ChatSendPayload, file: File): void {
  const remoteUrl = payload.photo_url || payload.video_url;
  if (!remoteUrl) return;
  try {
    storePreview(remoteUrl, URL.createObjectURL(file));
  } catch {
    /* aperçu optionnel — l'envoi ne doit pas échouer */
  }
}

export function peekChatMediaPreview(remoteUrl: string | null | undefined): string | null {
  if (!remoteUrl) return null;
  return previews.get(remoteUrl) ?? null;
}

export function clearChatMediaPreviews(): void {
  for (const url of previews.values()) URL.revokeObjectURL(url);
  previews.clear();
  order.length = 0;
}

function storePreview(remoteUrl: string, objectUrl: string): void {
  const previous = previews.get(remoteUrl);
  if (previous) URL.revokeObjectURL(previous);
  previews.set(remoteUrl, objectUrl);
  order.push(remoteUrl);
  evictOldestPreviews();
}

function evictOldestPreviews(): void {
  while (order.length > MAX_PREVIEWS) {
    const oldest = order.shift();
    if (!oldest || !previews.has(oldest)) continue;
    if (order.includes(oldest)) continue;
    const url = previews.get(oldest);
    if (url) URL.revokeObjectURL(url);
    previews.delete(oldest);
  }
}
