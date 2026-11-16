import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { branchService, type Branch } from "../services/branchService";
import { useAuth } from "../context/AuthContext";
import { useShellManagerScope } from "../context/ManagerScopeContext";
import { parseBranchFromSearch, writeManagerScopeBranchId } from "../utils/managerScopeBranch";
import { useBranchQueryWriter } from "./useManagerScopeState";

/** Snifim : ceux de la coque s'il y en a une (déjà chargés), sinon une liste propre (admin). */
function usePickableBranches(canPickBranch: boolean, shellBranches: Branch[] | null): Branch[] {
  const [own, setOwn] = useState<Branch[]>([]);
  const needOwn = canPickBranch && shellBranches === null;
  useEffect(() => {
    if (needOwn) branchService.list().then(setOwn).catch(() => setOwn([]));
  }, [needOwn]);
  return shellBranches ?? own;
}

/**
 * Snif courant : choisi par le menahel reshet (dans l'adresse `?branch=`, reprise par la pastille
 * de l'en-tête), imposé sinon. Partagé par l'accueil et l'onglet « צוות ».
 */
export function useManagerBranchScope() {
  const { user } = useAuth();
  const shell = useShellManagerScope();
  const [searchParams] = useSearchParams();
  const setSelectedBranch = useBranchQueryWriter();
  const canPickBranch = user?.role === "admin" || user?.role === "network_manager";
  const urlBranch = parseBranchFromSearch(searchParams);
  const selectedBranch = canPickBranch ? urlBranch : "";
  const scopeBranchId = canPickBranch ? urlBranch : user?.branch_id || urlBranch || "";
  const branches = usePickableBranches(canPickBranch, shell ? shell.branches : null);

  useEffect(() => {
    writeManagerScopeBranchId(scopeBranchId);
  }, [scopeBranchId]);

  return { canPickBranch, selectedBranch, setSelectedBranch, branches, scopeBranchId };
}
