import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ApiError } from "../services/api";
import { branchService, type Branch } from "../services/branchService";
import { dashboardService, type ManagerDashboard } from "../services/dashboardService";
import { promotionStageService, type PromotionStage } from "../services/promotionStageService";
import { useAuth } from "../context/AuthContext";
import { he } from "../i18n/he";
import { buildQuestionsQueue } from "../utils/dashboardCarousels";
import { todayIso } from "../utils/dateView";
import { parseBranchFromSearch, writeManagerScopeBranchId } from "../utils/managerScopeBranch";
import { homeBranchAfterOverview } from "../utils/networkDashboard";
import { playManagerQuestionSound } from "../utils/notificationSounds";

/** Snif courant : choisi par le menahel reshet (gardé dans l'URL et la session), imposé sinon. */
function useBranchScope() {
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

/** Son dédié quand une nouvelle question d'oved arrive (spec : réaction immédiate du menahel). */
function useQuestionSound(data: ManagerDashboard | null) {
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!data?.task_queues) return;
    const count = buildQuestionsQueue(data.task_queues).length;
    if (prev.current !== null && count > prev.current) playManagerQuestionSound();
    prev.current = count;
  }, [data?.task_queues]);
}

/** Données de l'accueil menahel : tableau de bord du jour, périmètre, étapes de במות. */
export function useManagerHomeData() {
  const { user } = useAuth();
  const scope = useBranchScope();
  const [data, setData] = useState<ManagerDashboard | null>(null);
  const [stages, setStages] = useState<PromotionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { canPickBranch, selectedBranch, branches, setSelectedBranch } = scope;

  const load = useCallback(async (silent = false) => {
    if (!silent) { setLoading(true); setError(""); }
    try {
      const dash = await dashboardService.getManager(canPickBranch ? selectedBranch || undefined : undefined, todayIso());
      setData(dash);
      const bid = dash.branch?.id;
      setStages(bid ? await promotionStageService.analysis(bid).catch(() => []) : []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canPickBranch, selectedBranch]);

  useEffect(() => { void load(); }, [load]);
  useQuestionSound(data);
  useEffect(() => {
    const next = homeBranchAfterOverview({
      canPickBranch, selectedBranch, overviewLoaded: Boolean(data) && !data?.branch,
      managesAllWorkers: data?.manages_all_workers, homeBranchId: user?.branch_id,
      onlyBranchId: branches.length === 1 ? branches[0].id : undefined,
    });
    if (next) setSelectedBranch(next);
  }, [canPickBranch, selectedBranch, data, user?.branch_id, branches, setSelectedBranch]);

  return { ...scope, data, stages, loading, error, setError, load };
}
