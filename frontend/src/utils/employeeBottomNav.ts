import { withSystemBottomInsetCss } from "./systemInsets";

export type EmployeeBottomTab = "tasks" | "chats" | "account";

/** Hauteur de la barre du bas (px), hors safe-area système. */
export const EMPLOYEE_BOTTOM_NAV_HEIGHT_PX = 72;

export const EMPLOYEE_BOTTOM_NAV_ITEMS: { tab: EmployeeBottomTab; path: string }[] = [
  { tab: "tasks", path: "/employee" },
  { tab: "chats", path: "/employee/chats" },
  { tab: "account", path: "/employee/account" },
];

/** Onglet actif d'après l'URL ; null hors des trois écrans principaux. */
export function resolveEmployeeBottomTab(pathname: string): EmployeeBottomTab | null {
  if (pathname === "/employee" || pathname === "/employee/") return "tasks";
  if (pathname.startsWith("/employee/chats")) return "chats";
  if (pathname.startsWith("/employee/account")) return "account";
  return null;
}

/** Sur les trois onglets, la barre du bas suffit : pas de bouton « retour » en plus. */
export function shouldShowEmployeeBack(pathname: string, appBack: boolean): boolean {
  return appBack && resolveEmployeeBottomTab(pathname) === null;
}

/** Espace laissé sous le contenu pour qu'il ne passe pas sous la barre. */
export function employeeBottomContentPadCss(): string {
  return withSystemBottomInsetCss(`${EMPLOYEE_BOTTOM_NAV_HEIGHT_PX + 24}px`);
}

/** Le bouton « signaler un bug » flotte au-dessus de la barre. */
export function employeeBottomNavFabBottomCss(): string {
  return withSystemBottomInsetCss(`${EMPLOYEE_BOTTOM_NAV_HEIGHT_PX + 12}px`);
}
