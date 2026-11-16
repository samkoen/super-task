import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../services/api";
import { dashboardService, type ManagerDashboard } from "../services/dashboardService";
import { promotionStageService, type PromotionStage } from "../services/promotionStageService";
import { useAuth } from "../context/AuthContext";
import { he } from "../i18n/he";
import { buildQuestionsQueue } from "../utils/dashboardCarousels";
import { todayIso } from "../utils/dateView";
import { homeBranchAfterOverview } from "../utils/networkDashboard";
import { playManagerQuestionSound } from "../utils/notificationSounds";
import { useManagerBranchScope } from "./useManagerBranchScope";

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
  const scope = useManagerBranchScope();
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
