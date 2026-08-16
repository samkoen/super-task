/** Helpers multi-snif (memberships + snif primaire). */

export interface UserBranchRef {
  branch_id: string | null;
  branches?: { branch_id: string; branch_name?: string; is_primary?: boolean }[];
}

export function userBelongsToBranch(user: UserBranchRef, branchId: string): boolean {
  if (!branchId) return true;
  if (user.branch_id === branchId) return true;
  return Boolean(user.branches?.some((b) => b.branch_id === branchId));
}

export function userBranchLabels(user: UserBranchRef): string[] {
  const fromMemberships = (user.branches ?? [])
    .map((b) => (b.branch_name || "").trim())
    .filter(Boolean);
  if (fromMemberships.length > 0) return fromMemberships;
  return [];
}
