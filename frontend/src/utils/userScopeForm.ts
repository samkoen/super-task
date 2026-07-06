import type { UserRole } from "../services/api";

export function needsNetworkField(role: UserRole): boolean {
  return role === "network_manager";
}

export function needsBranchField(role: UserRole, inviterRole?: UserRole): boolean {
  if (role !== "branch_manager" && role !== "employee") return false;
  if (inviterRole === "branch_manager" && role === "employee") return false;
  return true;
}

export function filterBranchesForInviter<T extends { id: string; network_id: string }>(
  branches: T[],
  inviterRole?: UserRole,
  inviterNetworkId?: string | null
): T[] {
  if (inviterRole === "network_manager" && inviterNetworkId) {
    return branches.filter((s) => s.network_id === inviterNetworkId);
  }
  return branches;
}
