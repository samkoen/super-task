import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, ButtonBase, CircularProgress, Dialog } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useDirectChatWith } from "../../hooks/useDirectChatWith";
import { useEmployeeDayTasks } from "../../hooks/useEmployeeDayTasks";
import { useManagerTaskActions } from "../../hooks/useManagerTaskActions";
import { he } from "../../i18n/he";
import { flowColor, flowScreenBackground, flowSize, flowText } from "../../styles/flowTokens";
import { networkAdHocIds } from "../../utils/adHocNetworkTasks";
import { todayIso } from "../../utils/dateView";
import { buildManagerTasksPath } from "../../utils/managerTaskFilters";
import type { TeamRosterEntry } from "../../utils/managerTeam";
import { groupTasksByPeriod } from "../../utils/managerTasksDay";
import { studioPathForEmployee } from "../../utils/studioOnce";
import DirectChatScreen from "../chat/DirectChatScreen";
import { HomeSectionTitle } from "../dashboard/home/homeUi";
import FlowPageHeader from "../taskflow/FlowPageHeader";
import ManagerTaskDialogs from "../tasks/today/ManagerTaskDialogs";
import ManagerTasksDayBoard from "../tasks/today/ManagerTasksDayBoard";
import { EmployeeActions, EmployeeHero, EmployeeQuality } from "./ManagerEmployeeSheetParts";
import { withSystemTopInsetCss, withSystemBottomInsetCss } from "../../utils/systemInsets";

type Props = {
  entry: TeamRosterEntry | null;
  onClose: () => void;
  /** « ניהול חשבון » : absent depuis l'accueil, où l'on n'a pas le compte de l'oved. */
  onAccount?: (entry: TeamRosterEntry) => void;
  /** Une tâche a changé (revue, édition, suppression) : la liste d'origine se recharge. */
  onChanged?: () => void;
  /** Où revenir après la création d'une tâche pour lui (par défaut : l'écran courant). */
  returnTo?: string;
};

/** Ses tâches du jour, dans le même rendu que l'onglet משימות ; un geste ouvre revue, résumé ou fiche. */
function EmployeeDayTasks({ entry, onChanged }: { entry: TeamRosterEntry; onChanged?: () => void }) {
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const navigate = useNavigate();
  const day = useEmployeeDayTasks(entry.id, entry.branchId);
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const networkIds = useMemo(() => networkAdHocIds(day.tasks), [day.tasks]);
  const actions = useManagerTaskActions({ canPickBranch, networkIds, reload: day.reload });
  const changed = (message?: string) => { if (message) showSuccess(message); void day.reload(true); onChanged?.(); };
  const allTasks = () => navigate(buildManagerTasksPath({ employeeId: entry.id, dueOn: todayIso(), branchId: entry.branchId || undefined }));
  return (
    <Box component="section" data-testid="employee-sheet-tasks" sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <HomeSectionTitle>{he.managerEmployeeTasksTitle}</HomeSectionTitle>
      {day.loading ? <CircularProgress sx={{ alignSelf: "center", color: flowColor.navy800 }} /> : (
        <ManagerTasksDayBoard groups={groupTasksByPeriod(day.tasks)} shownDay={todayIso()} emptyText={he.dashboardEmployeeDrawerEmpty} onOpen={(task) => actions.open(task, day.tasks)} />
      )}
      <ButtonBase data-testid="employee-sheet-all-tasks" onClick={allTasks} sx={{ alignSelf: "flex-start", ...flowText.button, color: flowColor.navy800, py: 1 }}>
        {he.managerEmployeeAllTasks}
      </ButtonBase>
      <ManagerTaskDialogs actions={actions} tasks={day.tasks} canManage onChanged={changed} />
    </Box>
  );
}

/**
 * Fiche d'un oved (onglet צוות et « הצוות עכשיו » de l'accueil) : où il en est, ses tâches du jour,
 * le chat direct, ses notes de qualité, et une tâche pour lui dans le studio unique.
 */
export default function ManagerEmployeeSheet({ entry, onClose, onAccount, onChanged, returnTo }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const chat = useDirectChatWith();
  const back = returnTo ?? `${location.pathname}${location.search}`;
  const newTask = (e: TeamRosterEntry) => navigate(studioPathForEmployee("/manager/tasks", e.id, e.branchId), { state: { returnTo: back } });
  return (
    <Dialog open={Boolean(entry)} onClose={onClose} fullScreen dir="rtl" PaperProps={{ sx: { background: flowScreenBackground } }} disableEnforceFocus>
      {entry ? (
        <Box data-testid="employee-sheet" sx={{ width: "100%", maxWidth: 440, mx: "auto", px: `${flowSize.contentPaddingX}px`, pt: withSystemTopInsetCss("20px"), pb: withSystemBottomInsetCss("32px"), display: "flex", flexDirection: "column", gap: "16px" }}>
          <FlowPageHeader title={entry.name} titleColor={flowColor.neutral900} onBack={onClose} />
          <EmployeeHero entry={entry} />
          <EmployeeActions onChat={() => void chat.open(entry.id, entry.name)} onNewTask={() => newTask(entry)} onAccount={onAccount ? () => onAccount(entry) : undefined} />
          <EmployeeDayTasks entry={entry} onChanged={onChanged} />
          <EmployeeQuality entry={entry} />
        </Box>
      ) : null}
      <DirectChatScreen chat={chat.chat} onClose={chat.close} />
    </Dialog>
  );
}
