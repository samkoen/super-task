/** Bouton « retour » Android : ce qu'il doit faire selon l'écran affiché. */
export type AndroidBackAction = "closeOverlay" | "navigateBack" | "goHome" | "leaveApp";

const OPEN_MODAL_SELECTOR = ".MuiModal-root:not(.MuiModal-hidden)";

/** Fenêtre MUI ouverte la plus haute (Dialog, Drawer, Menu) : la dernière du DOM est au-dessus. */
export function topOpenModal(doc: Document = document): HTMLElement | null {
  const modals = doc.querySelectorAll<HTMLElement>(OPEN_MODAL_SELECTOR);
  return modals.length ? modals[modals.length - 1] : null;
}

function normalize(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

export function resolveAndroidBackAction(input: {
  hasOpenModal: boolean;
  pathname: string;
  homePath: string | null;
  canGoBack: boolean;
}): AndroidBackAction {
  if (input.hasOpenModal) return "closeOverlay";
  const path = normalize(input.pathname);
  const atRoot = path === "/login" || (input.homePath !== null && path === normalize(input.homePath));
  if (atRoot) return "leaveApp";
  if (input.canGoBack) return "navigateBack";
  return input.homePath ? "goHome" : "leaveApp";
}

/** Ferme la fenêtre du dessus comme la touche Échap (passe par son onClose habituel). */
export function closeModal(modal: HTMLElement): void {
  modal.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
}
