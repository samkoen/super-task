import type { User } from "../services/api";

export function isViewAsPreview(user: User | null | undefined): boolean {
  return Boolean(user?.is_preview);
}

export function viewAsEmployeeName(user: User | null | undefined): string {
  return (user?.full_name || "").trim();
}
