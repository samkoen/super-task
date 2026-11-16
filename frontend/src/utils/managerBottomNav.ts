import { withManagerBranchQuery } from "./managerScopeBranch";
import { withSystemBottomInsetCss } from "./systemInsets";

/**
 * Pilule du bas menahel (Figma « Bottom Nav ») : 53 px de haut, posée à 18 px du bord.
 * Les onglets eux-mêmes sont dans `managerShell.ts`.
 */
export const MANAGER_PILL_HEIGHT_PX = 53;
export const MANAGER_PILL_OFFSET_PX = 18;
/** Marge sous le dernier contenu pour que la pilule ne le cache pas. */
export const MANAGER_BOTTOM_CONTENT_GAP_PX = 24;

/** Padding bas du scroll : pilule + décalage + marge + safe-area (WebView Android). */
export function managerBottomContentPadCss(): string {
  return withSystemBottomInsetCss(
    `${MANAGER_PILL_HEIGHT_PX + MANAGER_PILL_OFFSET_PX + MANAGER_BOTTOM_CONTENT_GAP_PX}px`,
  );
}

/** Hauteur où poser un bouton flottant (lanceur de bug) juste au-dessus de la pilule. */
export function managerFabBottomCss(): string {
  return withSystemBottomInsetCss(`${MANAGER_PILL_HEIGHT_PX + MANAGER_PILL_OFFSET_PX + 12}px`);
}

export function shouldShowManagerChrome(
  role: string | undefined | null,
  pathname = "",
): boolean {
  if (pathname.startsWith("/employee")) return false;
  return role === "branch_manager" || role === "network_manager";
}

/** « משימה חדשה » : le studio unique, sur le snif courant. */
export function managerNewTaskNavigation(branchId?: string | null) {
  return { pathname: withManagerBranchQuery("/manager/tasks/new", branchId) } as const;
}
