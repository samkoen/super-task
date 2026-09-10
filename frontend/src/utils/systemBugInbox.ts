const GERESH = /['׳'`’]/g;
export const SYSTEM_BUG_INBOX_PATH = "/system-bugs";
export const SYSTEM_BUG_OPEN = "open";
export const SYSTEM_BUG_CLOSED = "closed";
const INBOX_NAME = "יצחק ריצרד";

export function normalizePersonName(name: string): string {
  return name.replace(GERESH, "").split(/\s+/).filter(Boolean).join(" ");
}

export function canViewSystemBugInbox(
  user:
    | {
        full_name?: string;
        first_name?: string;
        last_name?: string;
        can_view_system_bug_inbox?: boolean;
      }
    | null
    | undefined,
): boolean {
  if (!user) return false;
  if (user.can_view_system_bug_inbox) return true;
  const raw = user.full_name?.trim() || `${user.first_name ?? ""} ${user.last_name ?? ""}`;
  return normalizePersonName(raw) === INBOX_NAME;
}

export function isSystemBugOpen(status?: string | null): boolean {
  return (status || SYSTEM_BUG_OPEN) !== SYSTEM_BUG_CLOSED;
}

export function canSubmitSystemBugComment(body: string): boolean {
  return Boolean(body.trim());
}
