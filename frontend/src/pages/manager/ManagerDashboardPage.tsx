import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import ListSkeleton from "../../components/ui/ListSkeleton";
import ManagerHomeDialogs, { type ManagerHomeDialogsState } from "../../components/dashboard/home/ManagerHomeDialogs";
import ManagerInboxStack from "../../components/dashboard/home/ManagerInboxStack";
import ManagerNetworkHome from "../../components/dashboard/home/ManagerNetworkHome";
import ManagerOwnTasksLine from "../../components/dashboard/home/ManagerOwnTasksLine";
import ManagerPulseCard from "../../components/dashboard/home/ManagerPulseCard";
import ManagerScopePicker from "../../components/dashboard/home/ManagerScopePicker";
import ManagerReviewScreen, { type ManagerReviewRequest } from "../../components/review/ManagerReviewScreen";
import ManagerTeamNow from "../../components/dashboard/home/ManagerTeamNow";
import PromotionStagesAnalysisTable from "../../components/dashboard/PromotionStagesAnalysisTable";
import StoreStatusAnalysisTable from "../../components/dashboard/StoreStatusAnalysisTable";
import StoreStatusKpiRow from "../../components/dashboard/StoreStatusKpiRow";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import { useManagerHomeData } from "../../hooks/useManagerHomeData";
import { useManagerInboxChats } from "../../hooks/useManagerInboxChats";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { ApiError } from "../../services/api";
import type { ManagerDashboard } from "../../services/dashboardService";
import type { PromotionStage } from "../../services/promotionStageService";
import { taskService } from "../../services/taskService";
import { he } from "../../i18n/he";
import { findQueuedTask } from "../../utils/dashboardCarousels";
import { dashboardTaskUsesReview } from "../../utils/dashboardTaskOpen";
import { formatHebrewDayNoYear, todayIso } from "../../utils/dateView";
import {
  buildManagerInbox,
  buildManagerPulse,
  buildNetworkOverview,
  buildTeamNow,
  chatsForScope,
  homeTitle,
  ownTasksSummary,
  type InboxItem,
  type TeamNowEntry,
} from "../../utils/managerHome";
import { reviewQueueFromInbox } from "../../utils/managerReview";

const NO_DIALOG: ManagerHomeDialogsState = { chatTask: null, reviewTarget: null, editOccurrenceId: null, member: null, directChat: null };

/** Aucun snif choisi = vue réseau, y compris pour le menahel qui gère tous les oveds (décision du 16.11). */
function isNetworkOverview(data: ManagerDashboard): boolean {
  return !data.branch;
}

/** Ouvre une tâche du tableau : la revue si une preuve attend, sinon l'édition. */
function useOpenTask(setDialogs: (patch: Partial<ManagerHomeDialogsState>) => void, onError: (m: string) => void) {
  return useCallback(async (taskId: string) => {
    try {
      const occurrence = await taskService.getOccurrence(taskId);
      if (dashboardTaskUsesReview(occurrence.status)) setDialogs({ reviewTarget: occurrence });
      else setDialogs({ editOccurrenceId: taskId });
    } catch (e) {
      onError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  }, [setDialogs, onError]);
}

/** « לבדיקה » ouvre la revue plein écran sur toute la file des preuves du périmètre. */
function useReviewLauncher(data: ManagerDashboard | null) {
  const [request, setRequest] = useState<ManagerReviewRequest | null>(null);
  const open = (taskId: string) => setRequest({ startId: taskId, queue: reviewQueueFromInbox(buildManagerInbox(data?.task_queues, [])) });
  return { request, open, close: useCallback(() => setRequest(null), []) };
}

function AnalysisPanel({ data, stages, onOpenTask }: { data: ManagerDashboard; stages: PromotionStage[]; onOpenTask: (taskId: string) => void }) {
  return (
    <Box data-testid="manager-analysis" sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <StoreStatusKpiRow storeKpis={data.store_kpis} />
      <StoreStatusAnalysisTable team={data.team} onOpenTask={(task) => onOpenTask(task.id)} />
      {data.branch ? <PromotionStagesAnalysisTable stages={stages} /> : null}
    </Box>
  );
}

/**
 * Accueil menahel (Figma « Menahel · בית (snif) ») : l'état du snif, ce qui attend le menahel
 * (« לטיפולך »), puis l'équipe. En mode « כל הרשת », seulement les snifim qui demandent une action.
 */
export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const navigate = useNavigate();
  const home = useManagerHomeData();
  const inbox = useManagerInboxChats();
  const [dialogs, setDialogsState] = useState<ManagerHomeDialogsState>(NO_DIALOG);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const setDialogs = useCallback((patch: Partial<ManagerHomeDialogsState>) => setDialogsState((d) => ({ ...d, ...patch })), []);
  const openTask = useOpenTask(setDialogs, showError);
  const { data, load } = home;
  const review = useReviewLauncher(data);

  useTaskChangeListener(useCallback(() => { void load(true); void inbox.reload(); }, [load, inbox.reload]));
  const network = Boolean(data && isNetworkOverview(data));
  useManagerPageHeader(homeTitle(data, user?.branch_name, he.managerHomeNetworkTitle), formatHebrewDayNoYear(todayIso()));

  const openInboxItem = (item: InboxItem) => {
    if (item.kind === "chat" && item.chat) { void inbox.openCard(item.chat); return; }
    if (!item.taskId) return;
    if (item.kind === "question") setDialogs({ chatTask: findQueuedTask(data?.task_queues, item.taskId) ?? null });
    else review.open(item.taskId);
  };
  const refresh = (message?: string) => { if (message) showSuccess(message); void load(true); };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {home.canPickBranch ? <ManagerScopePicker value={home.selectedBranch} branches={home.branches} onChange={home.setSelectedBranch} /> : null}
      {home.loading && !data ? <ListSkeleton variant="dashboard" /> : null}
      {home.error ? <Alert severity="error" onClose={() => home.setError("")}>{home.error}</Alert> : null}
      {inbox.openError ? <Alert severity="error" onClose={inbox.clearOpenError}>{inbox.openError}</Alert> : null}
      {data && network ? (
        <ManagerNetworkHome
          overview={buildNetworkOverview(data.branches)}
          onOpenBranch={home.setSelectedBranch}
          inbox={<ManagerInboxStack items={buildManagerInbox(data.task_queues, inbox.chats)} onOpen={openInboxItem} />}
        />
      ) : null}
      {data && !network ? (
        <BranchHome
          data={data}
          chats={chatsForScope(inbox.chats, data.branch?.id)}
          analysisOpen={analysisOpen}
          analysis={<AnalysisPanel data={data} stages={home.stages} onOpenTask={(id) => void openTask(id)} />}
          onToggleAnalysis={() => setAnalysisOpen((v) => !v)}
          onOpenInbox={openInboxItem}
          onOpenMember={(entry) => setDialogs({ member: entry.member })}
          onOpenOwnTasks={() => navigate("/employee")}
        />
      ) : null}
      <ManagerHomeDialogs
        state={{ ...dialogs, directChat: inbox.openChat }}
        branchId={home.scopeBranchId || data?.branch?.id || ""}
        dueOn={todayIso()}
        onCloseChatTask={() => setDialogs({ chatTask: null })}
        onCloseReview={() => setDialogs({ reviewTarget: null })}
        onCloseEdit={() => setDialogs({ editOccurrenceId: null })}
        onCloseMember={() => setDialogs({ member: null })}
        onCloseDirectChat={inbox.closeChat}
        onDone={refresh}
        onDirectSent={() => void inbox.reload()}
      />
      <ManagerReviewScreen request={review.request} onClose={review.close} onDone={refresh} />
    </Box>
  );
}

type BranchHomeProps = {
  data: ManagerDashboard;
  chats: Parameters<typeof buildManagerInbox>[1];
  analysisOpen: boolean;
  analysis: ReactNode;
  onToggleAnalysis: () => void;
  onOpenInbox: (item: InboxItem) => void;
  onOpenMember: (entry: TeamNowEntry) => void;
  onOpenOwnTasks: () => void;
};

/** Accueil d'un snif : ligne « mes tâches », pouls, « לטיפולך », « הצוות עכשיו ». */
function BranchHome({ data, chats, analysisOpen, analysis, onToggleAnalysis, onOpenInbox, onOpenMember, onOpenOwnTasks }: BranchHomeProps) {
  const pulse = useMemo(() => buildManagerPulse(data), [data]);
  const items = useMemo(() => buildManagerInbox(data.task_queues, chats), [data.task_queues, chats]);
  const team = useMemo(() => buildTeamNow(data.team), [data.team]);
  const own = ownTasksSummary(data.my_work);
  return (
    <>
      {own ? <ManagerOwnTasksLine summary={own} onOpen={onOpenOwnTasks} /> : null}
      <ManagerPulseCard pulse={pulse} analysisOpen={analysisOpen} onToggleAnalysis={onToggleAnalysis} />
      {analysisOpen ? analysis : null}
      <ManagerInboxStack items={items} onOpen={onOpenInbox} />
      <ManagerTeamNow entries={team} onOpen={onOpenMember} />
    </>
  );
}
