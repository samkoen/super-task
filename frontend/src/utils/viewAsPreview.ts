import type { User, UserRole } from "../services/api";

export function isViewAsPreview(user: User | null | undefined): boolean {
  return Boolean(user?.is_preview);
}

export function viewAsEmployeeName(user: User | null | undefined): string {
  return (user?.full_name || "").trim();
}

/** Oved ou menahel snif (oved du מנהל רשת), actif. */
export function canPickForViewAs(
  user: Pick<User, "is_active" | "role"> | null | undefined,
): boolean {
  if (!user?.is_active) return false;
  return user.role === "employee" || user.role === "branch_manager";
}

/** צפייה כעובד : toujours le dashboard oved. */
export function viewAsLandingPath(role: UserRole | undefined | null): string {
  if (role === "employee" || role === "branch_manager") return "/employee";
  return "/";
}
