import { createContext, useContext, type ReactNode } from "react";
import type { Branch } from "../services/branchService";
import { useManagerScopeState } from "../hooks/useManagerScopeState";

/** Périmètre choisi dans l'en-tête de la coque (menahel reshet) : vide = « כל הרשת ». */
export interface ManagerScope {
  branchId: string;
  branchName: string;
  branches: Branch[];
  setBranch: (branchId: string) => void;
}

const ManagerScopeContext = createContext<ManagerScope | null>(null);

/** Fourni par la coque menahel ; `enabled` seulement pour celui qui peut changer de snif. */
export function ManagerScopeProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const scope = useManagerScopeState(enabled);
  return <ManagerScopeContext.Provider value={enabled ? scope : null}>{children}</ManagerScopeContext.Provider>;
}

/**
 * Périmètre global de la coque, ou `null` hors coque (admin) ou pour un menahel snif :
 * la page garde alors son propre sélecteur.
 */
export function useShellManagerScope(): ManagerScope | null {
  return useContext(ManagerScopeContext);
}
