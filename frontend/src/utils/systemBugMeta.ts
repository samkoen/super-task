import type { User } from "../services/api";

export function systemBugAppVersion(): string {
  return "0.1.0";
}

export function systemBugPreviewLabel(user: User | null | undefined): string {
  if (!user?.is_preview) return "";
  const real = user.preview_real_user?.full_name || "";
  return real ? `כן (${real})` : "כן";
}
