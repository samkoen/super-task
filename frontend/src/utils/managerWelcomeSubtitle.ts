import { he } from "../i18n/he";
import type { UserRole } from "../services/api";

export function managerRoleLabel(role: UserRole | string | null | undefined): string {
  if (role === "admin") return he.roleAdmin;
  if (role === "network_manager") return he.roleNetworkManager;
  if (role === "branch_manager") return he.roleBranchManager;
  return "";
}

export function managerDashboardMeta(opts: {
  branchName?: string | null;
  networkName?: string | null;
  role?: UserRole | string | null;
}): string {
  const branch = (opts.branchName || "").trim();
  const place = branch ? `${he.branch}: ${branch}` : (opts.networkName || "").trim();
  return [place, managerRoleLabel(opts.role)].filter(Boolean).join(" · ");
}

/** Sous-titre dashboard menahel : שלום, X (שם הרשת) — une seule ligne. */
export function managerWelcomeSubtitle(
  fullName: string | null | undefined,
  networkName?: string | null
): string | undefined {
  const name = (fullName || "").trim();
  if (!name) return undefined;
  const base = he.welcome(name);
  const network = (networkName || "").trim();
  return network ? `${base} (${network})` : base;
}
