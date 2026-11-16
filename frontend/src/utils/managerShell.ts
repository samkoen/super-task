import type { UserRole } from "../services/api";
import { SYSTEM_BUG_INBOX_PATH } from "./systemBugInbox";
import { managerNewTaskNavigation } from "./managerBottomNav";
import { withManagerBranchQuery } from "./managerScopeBranch";

/**
 * Coque menahel (proposition UX du 16.11) : 4 onglets dans la pilule du bas, un rond « + »
 * pour créer et l'avatar qui ouvre la sheet « עוד ». Tout est pur ici pour être testé.
 */
export type ManagerTab = "tasks" | "team" | "chats" | "home";

/** Ordre visuel de la pilule Figma (direction LTR) : מסמכים · צוות · צ'אט · בית. */
export const MANAGER_TABS: { tab: ManagerTab; path: string }[] = [
  { tab: "tasks", path: "/manager/tasks" },
  { tab: "team", path: "/manager/employees" },
  { tab: "chats", path: "/manager/chats" },
  { tab: "home", path: "/manager" },
];

const TAB_PREFIXES: { tab: ManagerTab; prefixes: string[] }[] = [
  { tab: "tasks", prefixes: ["/manager/tasks", "/manager/fixed-tasks", "/manager/gallery", "/manager/issues"] },
  { tab: "team", prefixes: ["/manager/employees", "/manager/invitations"] },
  { tab: "chats", prefixes: ["/manager/chats"] },
];

function normalizePath(pathname: string): string {
  return pathname.replace(/\/+$/, "") || "/";
}

function startsWithSegment(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Onglet actif pour une adresse ; `null` sur les pages rangées dans « עוד ». */
export function resolveManagerTab(pathname: string): ManagerTab | null {
  const path = normalizePath(pathname);
  if (path === "/manager") return "home";
  const hit = TAB_PREFIXES.find((t) => t.prefixes.some((p) => startsWithSegment(path, p)));
  return hit ? hit.tab : null;
}

/** Adresse d'un onglet, en gardant le snif courant (menahel reshet). */
export function managerTabPath(tab: ManagerTab, branchId?: string | null): string {
  const item = MANAGER_TABS.find((t) => t.tab === tab);
  return withManagerBranchQuery(item ? item.path : "/manager", branchId);
}

export type ManagerTasksView = "today" | "fixed" | "library";

export const MANAGER_TASKS_VIEWS: { view: ManagerTasksView; path: string }[] = [
  { view: "today", path: "/manager/tasks" },
  { view: "fixed", path: "/manager/fixed-tasks" },
  { view: "library", path: "/manager/gallery" },
];

/** Vue de l'onglet משימות affichée en pastilles ; `null` ailleurs (studio, détail…). */
export function resolveManagerTasksView(pathname: string): ManagerTasksView | null {
  const path = normalizePath(pathname);
  const hit = MANAGER_TASKS_VIEWS.find((v) => v.path === path);
  return hit ? hit.view : null;
}

/** Racines d'onglet : pas de bouton retour, la pilule suffit. */
export function isManagerTabRoot(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/manager" || resolveManagerTasksView(path) !== null
    || path === "/manager/employees" || path === "/manager/chats";
}

export type ManagerMoreItem =
  | "myTasks"
  | "reports"
  | "branches"
  | "invitations"
  | "settings"
  | "account"
  | "systemBugs";

const MORE_PATHS: Record<ManagerMoreItem, string> = {
  myTasks: "/employee",
  reports: "/manager/reports",
  branches: "/manager/branches",
  invitations: "/manager/invitations",
  settings: "/manager/settings",
  account: "/manager/account",
  systemBugs: SYSTEM_BUG_INBOX_PATH,
};

export function managerMorePath(item: ManagerMoreItem): string {
  return MORE_PATHS[item];
}

/**
 * Entrées de la sheet « עוד » (choses rares). מחלקות et מוצרים sont retirés de l'interface
 * tant qu'ils ne servent pas (décision du 16.11) ; leurs routes restent en place.
 */
export function managerMoreItems(role: UserRole | undefined | null, canSeeSystemBugs: boolean): ManagerMoreItem[] {
  const items: ManagerMoreItem[] = [];
  if (role === "branch_manager") items.push("myTasks");
  items.push("reports");
  if (role === "network_manager") items.push("branches");
  items.push("invitations", "settings", "account");
  if (canSeeSystemBugs) items.push("systemBugs");
  return items;
}

export type ManagerCreateChoice = "adHoc" | "fixed" | "library";

export const MANAGER_CREATE_CHOICES: ManagerCreateChoice[] = ["adHoc", "fixed", "library"];

export type ManagerNavigationTarget = { pathname: string; state?: Record<string, boolean> };

/** Où mène chaque choix du rond « + » : tous ouvrent le studio unique (étape 5). */
export function managerCreateNavigation(choice: ManagerCreateChoice, branchId?: string | null): ManagerNavigationTarget {
  if (choice === "fixed") return { pathname: "/manager/fixed-tasks/new" };
  if (choice === "library") return { pathname: withManagerBranchQuery("/manager/tasks/new?library=1", branchId) };
  return { pathname: managerNewTaskNavigation(branchId).pathname };
}
