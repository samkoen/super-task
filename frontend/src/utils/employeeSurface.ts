/** Dashboard oved : employés, et menahel snif (oved du מנהל רשת). */
export function canAccessEmployeeDashboard(role: string | undefined | null): boolean {
  return role === "employee" || role === "branch_manager";
}

/** Chrome oved (pas barre menahel) sur /employee. */
export function usesEmployeeChrome(
  role: string | undefined | null,
  pathname: string,
): boolean {
  if (role === "employee") return true;
  return role === "branch_manager" && pathname.startsWith("/employee");
}
