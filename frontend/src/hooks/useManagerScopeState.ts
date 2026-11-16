import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { branchService, type Branch } from "../services/branchService";
import type { ManagerScope } from "../context/ManagerScopeContext";
import { he } from "../i18n/he";
import {
  branchScopeLabel,
  parseBranchFromSearch,
  searchWithBranch,
  writeManagerScopeBranchId,
} from "../utils/managerScopeBranch";

/**
 * Écrit le snif choisi dans l'adresse (`?branch=`) et dans la session : les onglets de la pilule
 * le reprennent (`withManagerBranchQuery`), et chaque page le relit dans l'adresse.
 */
export function useBranchQueryWriter() {
  const [, setSearchParams] = useSearchParams();
  return useCallback((branchId: string) => {
    writeManagerScopeBranchId(branchId);
    setSearchParams((prev) => searchWithBranch(prev, branchId), { replace: true });
  }, [setSearchParams]);
}

/** Liste des snifim, chargée une fois quand le périmètre peut changer. */
function useBranchList(enabled: boolean): Branch[] {
  const [branches, setBranches] = useState<Branch[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    branchService.list().then((list) => { if (alive) setBranches(list); }).catch(() => { if (alive) setBranches([]); });
    return () => { alive = false; };
  }, [enabled]);
  return branches;
}

/**
 * Périmètre global du menahel reshet (étape 8) : « כל הרשת » ou un snif, valable pour les 4 onglets.
 * L'adresse est la source de vérité ; vide = toute la reshet.
 */
export function useManagerScopeState(enabled: boolean): ManagerScope {
  const [searchParams] = useSearchParams();
  const branches = useBranchList(enabled);
  const setBranch = useBranchQueryWriter();
  const branchId = parseBranchFromSearch(searchParams);
  useEffect(() => {
    if (enabled && branchId) writeManagerScopeBranchId(branchId);
  }, [enabled, branchId]);
  return useMemo(() => ({
    branchId,
    branches,
    branchName: branchScopeLabel(branchId, branches, { network: he.managerHomeNetworkTitle, fallback: he.managerScopeBranchFallback }),
    setBranch,
  }), [branchId, branches, setBranch]);
}
