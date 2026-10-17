/**
 * État partagé « écran פתיחת משמרת affiché » : la page oved le publie,
 * le Layout (barre du bas, cloche) le lit pour s'effacer sur cet écran.
 */
let open = false;
const listeners = new Set<() => void>();

export function setEmployeeStartDoorOpen(value: boolean): void {
  if (open === value) return;
  open = value;
  listeners.forEach((listener) => listener());
}

export function getEmployeeStartDoorOpen(): boolean {
  return open;
}

export function subscribeEmployeeStartDoor(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
