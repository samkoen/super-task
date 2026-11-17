/**
 * État partagé « écran 01 המשימות להיום (FLOW 2) affiché » : la page oved le publie,
 * le Layout le lit pour retirer sa barre du haut, sa barre du bas et ses marges
 * (l'écran Figma a sa propre en-tête et sa propre Bottom Nav).
 */
let shown = false;
const listeners = new Set<() => void>();

export function setEmployeeTodayScreen(value: boolean): void {
  if (shown === value) return;
  shown = value;
  listeners.forEach((listener) => listener());
}

export function getEmployeeTodayScreen(): boolean {
  return shown;
}

export function subscribeEmployeeTodayScreen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
