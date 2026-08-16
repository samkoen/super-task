import { withManagerBranchQuery } from "./managerScopeBranch";

export type ManagerBottomTab = "home" | "tasks" | "archive";

/** Hauteur barre bas (px), hors safe-area système Android/iOS. */
export const MANAGER_BOTTOM_NAV_HEIGHT_PX = 64;
/** Marge sous le dernier contenu pour ne pas être masqué par la barre / FAB. */
export const MANAGER_BOTTOM_CONTENT_GAP_PX = 48;

/** Padding bas du scroll : barre + gap + safe-area (WebView Android). */
export function managerBottomContentPadCss(): string {
  return `calc(${MANAGER_BOTTOM_NAV_HEIGHT_PX + MANAGER_BOTTOM_CONTENT_GAP_PX}px + env(safe-area-inset-bottom, 0px))`;
}

/** Position verticale du FAB au-dessus de la barre. */
export function managerFabBottomCss(): string {
  return `calc(${MANAGER_BOTTOM_NAV_HEIGHT_PX + 12}px + env(safe-area-inset-bottom, 0px))`;
}

export const MANAGER_BOTTOM_NAV_ITEMS: {
  tab: ManagerBottomTab;
  path: string;
}[] = [
  { tab: "home", path: "/manager" },
  { tab: "tasks", path: "/manager/tasks" },
  { tab: "archive", path: "/manager/gallery" },
];

export function resolveManagerBottomTab(pathname: string): ManagerBottomTab | null {
  if (pathname === "/manager" || pathname === "/manager/") return "home";
  if (pathname.startsWith("/manager/tasks")) return "tasks";
  if (pathname.startsWith("/manager/gallery")) return "archive";
  // Autres pages manager : aucun onglet actif, barre visible quand même
  if (pathname.startsWith("/manager")) return null;
  return null;
}

export function shouldShowManagerChrome(role: string | undefined | null): boolean {
  return role === "branch_manager" || role === "network_manager";
}

/** Path onglet bas avec snif courant (storage / param explicite). */
export function managerBottomNavPath(tabPath: string, branchId?: string | null): string {
  return withManagerBranchQuery(tabPath, branchId);
}

export function managerNewTaskNavigation(branchId?: string | null) {
  return {
    pathname: withManagerBranchQuery("/manager/tasks", branchId),
    state: { openNewTask: true },
  } as const;
}
