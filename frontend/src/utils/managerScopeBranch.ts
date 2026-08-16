/** Snif courant (dashboard) — conservé pour navigations bas / FAB. */

export const MANAGER_SCOPE_BRANCH_STORAGE_KEY = "super.managerScopeBranch";
export const MANAGER_SCOPE_BRANCH_QUERY = "branch";

export function readManagerScopeBranchId(): string {
  try {
    return (sessionStorage.getItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY) || "").trim();
  } catch {
    return "";
  }
}

export function writeManagerScopeBranchId(branchId: string | null | undefined): void {
  const id = (branchId || "").trim();
  try {
    if (id) sessionStorage.setItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY, id);
    else sessionStorage.removeItem(MANAGER_SCOPE_BRANCH_STORAGE_KEY);
  } catch {
    /* private mode / unavailable */
  }
}

/** Ajoute ou remplace `branch=` sur un path (avec ou sans query). */
export function withManagerBranchQuery(
  path: string,
  branchId?: string | null,
): string {
  const id = (branchId ?? readManagerScopeBranchId()).trim();
  const qIndex = path.indexOf("?");
  const base = qIndex >= 0 ? path.slice(0, qIndex) : path;
  const params = new URLSearchParams(qIndex >= 0 ? path.slice(qIndex + 1) : "");
  if (id) params.set(MANAGER_SCOPE_BRANCH_QUERY, id);
  else params.delete(MANAGER_SCOPE_BRANCH_QUERY);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseBranchFromSearch(search: string | URLSearchParams): string {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  return (params.get(MANAGER_SCOPE_BRANCH_QUERY) || "").trim();
}
