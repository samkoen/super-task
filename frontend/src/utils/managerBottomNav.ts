export type ManagerBottomTab = "home" | "tasks" | "archive";

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

export function managerNewTaskNavigation() {
  return {
    pathname: "/manager/tasks",
    state: { openNewTask: true },
  } as const;
}
