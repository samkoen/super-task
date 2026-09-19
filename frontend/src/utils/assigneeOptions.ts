import type { User } from "../services/api";
import { he } from "../i18n/he";
import { userBelongsToBranch } from "./userBranchMembership";

export function withSelfAssignee(employees: User[], self: User | null | undefined): User[] {
  if (!self?.id) return employees;
  if (employees.some((user) => user.id === self.id)) return employees;
  return [self, ...employees];
}

export function assigneesForBranch(
  employees: User[],
  branchId: string | null | undefined,
  selfId?: string | null,
): User[] {
  if (!branchId) return employees;
  return employees.filter(
    (user) => userBelongsToBranch(user, branchId) || user.id === selfId,
  );
}

export function assigneeOptionLabel(
  user: Pick<User, "id" | "full_name">,
  selfId?: string | null,
): string {
  if (selfId && user.id === selfId) return `${user.full_name} (${he.assignToMyself})`;
  return user.full_name;
}
