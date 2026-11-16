import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { branchService, type Branch } from "../services/branchService";
import { useAuth } from "../context/AuthContext";
import { parseBranchFromSearch, writeManagerScopeBranchId } from "../utils/managerScopeBranch";

/**
 * Snif courant : choisi par le menahel reshet (gardé dans l'URL et la session), imposé sinon.
 * Partagé par l'accueil et l'onglet « צוות ».
 */
export function useManagerBranchScope() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBranch, setSelectedBranch] = useState(() => parseBranchFromSearch(searchParams) || "");
  const [branches, setBranches] = useState<Branch[]>([]);
  const canPickBranch = user?.role === "admin" || user?.role === "network_manager";
  const scopeBranchId = canPickBranch ? selectedBranch : user?.branch_id || selectedBranch || "";

  useEffect(() => {
    writeManagerScopeBranchId(scopeBranchId);
    if (!canPickBranch) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (selectedBranch) next.set("branch", selectedBranch);
      else next.delete("branch");
      return next;
    }, { replace: true });
  }, [scopeBranchId, selectedBranch, canPickBranch, setSearchParams]);

  useEffect(() => {
    if (canPickBranch) branchService.list().then(setBranches).catch(() => setBranches([]));
  }, [canPickBranch]);

  return { canPickBranch, selectedBranch, setSelectedBranch, branches, scopeBranchId };
}
