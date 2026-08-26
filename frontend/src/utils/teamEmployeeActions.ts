export function canManageAsTeamEmployee(role: string | undefined | null): boolean {
  return role === "employee";
}
