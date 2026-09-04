import { he } from "../i18n/he";

export const CHAT_FILE_ACCEPT = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".zip",
  ".rtf",
  ".odt",
  ".ods",
].join(",");

export function chatFileLabel(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed || he.chatFileFallback;
}
