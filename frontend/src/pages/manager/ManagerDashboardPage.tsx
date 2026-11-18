import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box } from "@mui/material";
import ListSkeleton from "../../components/ui/ListSkeleton";
import ManagerColumns from "../../components/dashboard/home/ManagerColumns";
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
import { useShellManagerScope } from "../../context/ManagerScopeContext";
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

const NO_DIALOG: ManagerHomeDialogsState = { chatTask: null, summaryTaskId: null, editOccurrenceId: null, member: null, directChat: null };

/** Aucun snif choisi = vue réseau, y compris pour le menahel qui gère tous les oveds (décision du 16.11). */
function isNetworkOverview(data: ManagerDashboard): boolean {
  return !data.branch;
}

/** Ouvre une tâche du tableau : la revue si une preuve attend, le résumé si elle est fermée, sinon l'édition. */
function useOpenTask(setDialogs: (patch: Partial<ManagerHomeDialogsState>) => void, openReview: (taskId: string) => void, onError: (m: string) => void) {
  return useCallback(async (taskId: string) => {
    try {
      const occurrence = await taskService.getOccurrence(taskId);
      if (occurrence.status === "pending_review") openReview(taskId);
      else if (dashboardTaskUsesReview(occurrence.status)) setDialogs({ summaryTaskId: taskId });
      else setDialogs({ editOccurrenceId: taskId });
    } catch (e) {
      onError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  }, [setDialogs, openReview, onError]);
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

/** Fenêtres de l'accueil (un seul état) et ouverture d'une tâche du tableau d'analyse. */
function useHomeDialogs(openReview: (taskId: string) => void, onError: (m: string) => void) {
  const [dialogs, setDialogsState] = useState<ManagerHomeDialogsState>(NO_DIALOG);
  const setDialogs = useCallback((patch: Partial<ManagerHomeDialogsState>) => setDialogsState((d) => ({ ...d, ...patch })), []);
  return { dialogs, setDialogs, openTask: useOpenTask(setDialogs, openReview, onError) };
}

/** « לטיפולך » : un message ouvre le chat direct, une question son chat de tâche, une preuve la revue. */
function useInboxOpener(data: ManagerDashboard | null, inbox: ReturnType<typeof useManagerInboxChats>, setDialogs: (p: Partial<ManagerHomeDialogsState>) => void, openReview: (taskId: string) => void) {
  return (item: InboxItem) => {
    if (item.kind === "chat" && item.chat) { void inbox.openCard(item.chat); return; }
    if (!item.taskId) return;
    if (item.kind === "question") setDialogs({ chatTask: findQueuedTask(data?.task_queues, item.taskId) ?? null });
    else openReview(item.taskId);
  };
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
  const { data, load } = home;
  const review = useReviewLauncher(data);
  const { dialogs, setDialogs, openTask } = useHomeDialogs(review.open, showError);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const openInboxItem = useInboxOpener(data, inbox, setDialogs, review.open);
  useTaskChangeListener(useCallback(() => { void load(true); void inbox.reload(); }, [load, inbox.reload]));
  const network = Boolean(data && isNetworkOverview(data));
  useManagerPageHeader(homeTitle(data, user?.branch_name, he.managerHomeNetworkTitle), formatHebrewDayNoYear(todayIso()));
  const refresh = (message?: string) => { if (message) showSuccess(message); void load(true); };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <HomeTop home={home} inbox={inbox} />
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
        onPatch={setDialogs}
        onCloseDirectChat={inbox.closeChat}
        onDone={refresh}
        onDirectSent={() => void inbox.reload()}
      />
      <ManagerReviewScreen request={review.request} onClose={review.close} onDone={refresh} />
    </Box>
  );
}

type HomeTopProps = { home: ReturnType<typeof useManagerHomeData>; inbox: ReturnType<typeof useManagerInboxChats> };

/** Périmètre (admin hors coque ; dans la coque il est dans l'en-tête), chargement et erreurs. */
function HomeTop({ home, inbox }: HomeTopProps) {
  const shellScope = useShellManagerScope();
  return (
    <>
      {home.canPickBranch && !shellScope ? <ManagerScopePicker value={home.selectedBranch} branches={home.branches} onChange={home.setSelectedBranch} /> : null}
      {home.loading && !home.data ? <ListSkeleton variant="dashboard" /> : null}
      {home.error ? <Alert severity="error" onClose={() => home.setError("")}>{home.error}</Alert> : null}
      {inbox.openError ? <Alert severity="error" onClose={inbox.clearOpenError}>{inbox.openError}</Alert> : null}
    </>
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
  // Ordinateur : l'état du snif et « לטיפולך » d'un côté, l'équipe de l'autre ; mobile : même ordre empilé.
  return (
    <ManagerColumns
      first={
        <>
          {own ? <ManagerOwnTasksLine summary={own} onOpen={onOpenOwnTasks} /> : null}
          <ManagerPulseCard pulse={pulse} analysisOpen={analysisOpen} onToggleAnalysis={onToggleAnalysis} />
          {analysisOpen ? analysis : null}
          <ManagerInboxStack items={items} onOpen={onOpenInbox} />
        </>
      }
      second={<ManagerTeamNow entries={team} onOpen={onOpenMember} />}
    />
  );
}
