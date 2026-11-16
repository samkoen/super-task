import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, ButtonBase } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import type { User } from "../../services/api";
import type { Branch } from "../../services/branchService";
import ManagerScopePicker from "../../components/dashboard/home/ManagerScopePicker";
import ManagerTaskDialogs from "../../components/tasks/today/ManagerTaskDialogs";
import ManagerTasksDayBoard from "../../components/tasks/today/ManagerTasksDayBoard";
import ManagerTasksFilters from "../../components/tasks/today/ManagerTasksFilters";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import { useManagerTaskActions } from "../../hooks/useManagerTaskActions";
import { useManagerTasksFilters, type ManagerTasksFilterValues } from "../../hooks/useManagerTasksFilters";
import { useManagerTasksList } from "../../hooks/useManagerTasksList";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import { formatHebrewDayNoYear } from "../../utils/dateView";
import { filterManagerTaskOccurrences, MANAGER_TASK_STATUS_FILTERS } from "../../utils/managerTaskFilters";
import { withManagerBranchQuery } from "../../utils/managerScopeBranch";
import { dayNavLabel, groupTasksByPeriod } from "../../utils/managerTasksDay";
import { userBelongsToBranch } from "../../utils/userBranchMembership";
import { networkAdHocIds } from "../../utils/adHocNetworkTasks";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";

type LegacyCreateState = {
  adHocPrefillFromIssue?: AdHocTaskPrefillFromIssue;
  openNewTask?: boolean;
  openGalleryTask?: boolean;
} | null;

/** Anciens liens (« משימה חדשה », bibliothèque, signalement) : tous mènent au studio unique. */
function useLegacyCreateRedirect(basePath: string) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const state = location.state as LegacyCreateState;
    if (!state) return;
    if (state.openGalleryTask) navigate(withManagerBranchQuery(`${basePath}/new?library=1`), { replace: true });
    else if (state.openNewTask) navigate(withManagerBranchQuery(`${basePath}/new`), { replace: true });
    else if (state.adHocPrefillFromIssue) navigate(`${basePath}/new`, { replace: true, state });
  }, [location.state, basePath, navigate]);
}

/** Admin : pas de « + » dans une barre du haut, le bouton est posé sur la page. */
function AdminNewTaskButton({ onClick }: { onClick: () => void }) {
  return (
    <ButtonBase
      data-testid="tasks-new"
      onClick={onClick}
      sx={{ alignSelf: "flex-start", height: 40, px: "16px", gap: "6px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button }}
    >
      <AddRoundedIcon fontSize="small" />
      {he.newTask}
    </ButtonBase>
  );
}

/** Oveds proposés dans le filtre : ceux du snif regardé (et le menahel lui-même). */
function useFilterEmployees(employees: User[], scopeBranchId: string, selfId: string | undefined) {
  return useMemo(
    () => (scopeBranchId ? employees.filter((u) => userBelongsToBranch(u, scopeBranchId) || u.id === selfId) : employees),
    [employees, scopeBranchId, selfId],
  );
}

/** Un oved d'un lien profond (?employee=) qui n'est pas dans le snif est retiré, une fois l'équipe chargée. */
function useDropForeignEmployee(ready: boolean, employee: string, allowed: User[], update: (p: Partial<ManagerTasksFilterValues>) => void) {
  useEffect(() => {
    if (!ready) return;
    if (employee && !allowed.some((u) => u.id === employee)) update({ employee: "" });
  }, [ready, employee, allowed, update]);
}

type FiltersBarProps = {
  canPickBranch: boolean;
  branches: Branch[];
  employees: User[];
  tasksFilters: ReturnType<typeof useManagerTasksFilters>;
};

/** Périmètre (menahel reshet), puis oved, statut et jour. */
function ManagerTasksFiltersBar({ canPickBranch, branches, employees, tasksFilters }: FiltersBarProps) {
  const { filters: f, update, moveDay } = tasksFilters;
  const dayLabel = f.mode === "day" ? dayNavLabel(f.day) : `${formatHebrewDayNoYear(f.from)} – ${formatHebrewDayNoYear(f.to)}`;
  return (
    <>
      {canPickBranch ? <ManagerScopePicker value={f.branch} branches={branches} onChange={(branch) => update({ branch })} /> : null}
      <ManagerTasksFilters
        employees={employees.map((u) => ({ value: u.id, label: u.full_name }))}
        statuses={MANAGER_TASK_STATUS_FILTERS.map((value) => ({ value, label: he.taskStatusLabels[value] }))}
        employeeId={f.employee}
        status={f.status}
        dayLabel={dayLabel}
        onEmployee={(employee) => update({ employee })}
        onStatus={(status) => update({ status })}
        onPrevDay={() => moveDay(-1)}
        onNextDay={() => moveDay(1)}
      />
    </>
  );
}

/** Onglet « משימות › היום » : le jour en trois blocs, filtres en pastilles, une tâche s'ouvre d'un geste. */
export default function ManagerTasksPage() {
  const { user } = useAuth();
  const { showSuccess } = useFeedback();
  const navigate = useNavigate();
  const canPickBranch = user?.role === "network_manager" || user?.role === "admin";
  const canManageTasks = canPickBranch || user?.role === "branch_manager";
  const tasksFilters = useManagerTasksFilters(canPickBranch);
  const f = tasksFilters.filters;
  const scopeBranchId = canPickBranch ? f.branch : user?.branch_id ?? "";
  const list = useManagerTasksList({ branchId: scopeBranchId, day: f.day, mode: f.mode, from: f.from, to: f.to });
  const filterEmployees = useFilterEmployees(list.employees, scopeBranchId, user?.id);
  const shown = useMemo(() => filterManagerTaskOccurrences(list.occurrences, { employeeId: f.employee, status: f.status }), [list.occurrences, f.employee, f.status]);
  const networkIds = useMemo(() => networkAdHocIds(list.occurrences), [list.occurrences]);
  const actions = useManagerTaskActions({ canPickBranch, networkIds, reload: list.load });
  const tasksBasePath = useLocation().pathname.startsWith("/admin") ? "/admin/tasks" : "/manager/tasks";
  useLegacyCreateRedirect(tasksBasePath);
  useDropForeignEmployee(!list.loading && list.employees.length > 0, f.employee, filterEmployees, tasksFilters.update);
  useManagerPageHeader(he.managerTasks, formatHebrewDayNoYear(f.mode === "day" ? f.day : f.from));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {user?.role === "admin" ? <AdminNewTaskButton onClick={() => navigate(`${tasksBasePath}/new`)} /> : null}
      <ManagerTasksFiltersBar canPickBranch={canPickBranch} branches={list.branches} employees={filterEmployees} tasksFilters={tasksFilters} />
      {list.loading ? <ListSkeleton variant="cards" rows={6} /> : (
        <ManagerTasksDayBoard
          groups={groupTasksByPeriod(shown)}
          shownDay={f.mode === "day" ? f.day : ""}
          emptyText={f.employee || f.status ? he.managerTasksEmptyFiltered : he.managerTasksEmpty}
          onOpen={(task) => actions.open(task, shown)}
        />
      )}
      <ManagerTaskDialogs
        actions={actions}
        tasks={list.occurrences}
        employees={list.employees}
        canManage={canManageTasks}
        onChanged={(message) => { if (message) showSuccess(message); void list.load(true); }}
      />
    </Box>
  );
}
