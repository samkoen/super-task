export const CHAT_PAGE_SIZE = 30;

export interface ChatMessagePage<T extends { id: string }> {
  messages: T[];
  has_more: boolean;
}

export function mergeOlderMessages<T extends { id: string }>(loaded: T[], older: T[]): T[] {
  const seen = new Set(loaded.map((m) => m.id));
  return [...older.filter((m) => !seen.has(m.id)), ...loaded];
}

export function mergeNewerMessages<T extends { id: string }>(loaded: T[], incoming: T[]): T[] {
  const seen = new Set(loaded.map((m) => m.id));
  return [...loaded, ...incoming.filter((m) => !seen.has(m.id))];
}
