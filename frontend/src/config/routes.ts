import type { UserRole } from "../services/api";

export function getHomePath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "network_manager":
    case "branch_manager":
      return "/manager";
    case "employee":
      return "/employee";
    default:
      return "/";
  }
}
