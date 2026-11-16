import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Box, ButtonBase } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import ManagerScopePicker from "../../components/dashboard/home/ManagerScopePicker";
import ManagerReviewScreen, { type ManagerReviewRequest } from "../../components/review/ManagerReviewScreen";
import ManagerTaskEditFooter from "../../components/tasks/today/ManagerTaskEditFooter";
import ManagerTasksDayBoard from "../../components/tasks/today/ManagerTasksDayBoard";
import ManagerTasksFilters from "../../components/tasks/today/ManagerTasksFilters";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../../components/tasks/TaskOccurrenceEditDialog";
import ConfirmDeleteDialog from "../../components/ui/ConfirmDeleteDialog";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import {
  defaultRangeFrom,
  formatHebrewDayNoYear,
  shiftDay,
  todayIso,
  type TaskDateViewMode,
} from "../../utils/dateView";
import {
  buildManagerTasksPath,
  filterManagerTaskOccurrences,
  MANAGER_TASK_STATUS_FILTERS,
  parseManagerTasksSearchParams,
} from "../../utils/managerTaskFilters";
import { withManagerBranchQuery, writeManagerScopeBranchId } from "../../utils/managerScopeBranch";
import { dashboardTaskUsesReview } from "../../utils/dashboardTaskOpen";
import { dayNavLabel, groupTasksByPeriod, reviewQueueFromTasks } from "../../utils/managerTasksDay";
import { userBelongsToBranch } from "../../utils/userBranchMembership";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import {
  defaultApplyAdHocEditToNetwork,
  isNetworkAdHocOccurrence,
  networkAdHocIds,
} from "../../utils/adHocNetworkTasks";
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

export default function ManagerTasksPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useFeedback();
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOccurrenceId, setEditOccurrenceId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);
  const [deleting, setDeleting] = useState<TaskOccurrence | null>(null);
  const [deleteAllBranches, setDeleteAllBranches] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  // Filtres lus dans l'adresse dès le premier rendu : le premier chargement vise déjà le bon snif.
  const [initialUrl] = useState(() => parseManagerTasksSearchParams(searchParams));
  const [filterBranch, setFilterBranch] = useState(initialUrl.branchId ?? "");
  const [filterEmployee, setFilterEmployee] = useState(initialUrl.employeeId);
  const [filterStatus, setFilterStatus] = useState(initialUrl.status);
  const [filterDay, setFilterDay] = useState(initialUrl.dueOn || todayIso());
  const [dateViewMode, setDateViewMode] = useState<TaskDateViewMode>(initialUrl.dateViewMode);
  const [filterFrom, setFilterFrom] = useState(initialUrl.rangeFrom || todayIso());
  const [filterTo, setFilterTo] = useState(initialUrl.rangeTo || defaultRangeFrom(todayIso(), 7).to);
  const [reviewRequest, setReviewRequest] = useState<ManagerReviewRequest | null>(null);

  const isBranchManager = user?.role === "branch_manager";
  const isNetworkManager = user?.role === "network_manager";
  const canManageTasks = isBranchManager || isNetworkManager || user?.role === "admin";
  const canPickBranch = isNetworkManager || user?.role === "admin";

  const scopeBranchId = useMemo(() => {
    if (canPickBranch) return filterBranch;
    return user?.branch_id ?? "";
  }, [canPickBranch, filterBranch, user?.branch_id]);

  const filterEmployees = useMemo(
    () =>
      scopeBranchId
        ? employees.filter((u) => userBelongsToBranch(u, scopeBranchId) || u.id === user?.id)
        : employees,
    [employees, scopeBranchId, user?.id]
  );

  const displayedOccurrences = useMemo(
    () => filterManagerTaskOccurrences(occurrences, { employeeId: filterEmployee, status: filterStatus }),
    [occurrences, filterEmployee, filterStatus],
  );
  const networkIds = useMemo(() => networkAdHocIds(occurrences), [occurrences]);

  useManagerPageHeader(he.managerTasks, formatHebrewDayNoYear(dateViewMode === "day" ? filterDay : filterFrom));

  // Seule la dernière demande compte : un changement de filtre pendant un chargement n'est plus perdu.
  const loadSeq = useRef(0);
  const load = useCallback(async (silent = false) => {
    const seq = ++loadSeq.current;
    if (!silent) setLoading(true);
    try {
      const branchId = scopeBranchId || undefined;
      const dateParams =
        dateViewMode === "day"
          ? { due_on: filterDay }
          : { due_from: filterFrom, due_to: filterTo };
      // Afficher la liste dès que les occurrences arrivent (ne pas attendre branches/équipe).
      const occ = await taskService.listOccurrences({ branch_id: branchId, ...dateParams });
      if (seq !== loadSeq.current) return;
      setOccurrences(occ);
      if (!silent) setLoading(false);
      void Promise.all([branchService.list(), userService.listTeam("employee")])
        .then(([branchList, team]) => {
          setBranches(branchList);
          setEmployees(withSelfAssignee(team, user));
        })
        .catch(() => {
          /* filtres incomplets — la liste reste utilisable */
        });
    } catch (e) {
      if (seq !== loadSeq.current) return;
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      if (!silent) setLoading(false);
    }
  }, [scopeBranchId, filterDay, filterFrom, filterTo, dateViewMode, showError, user]);

  useEffect(() => {
    load();
  }, [load]);

  useTaskChangeListener(useCallback(() => {
    load(true);
  }, [load]));

  useEffect(() => {
    if (!location.search) return;
    const parsed = parseManagerTasksSearchParams(searchParams);
    setFilterEmployee(parsed.employeeId);
    setFilterStatus(parsed.status);
    setFilterDay(parsed.dueOn);
    setDateViewMode(parsed.dateViewMode);
    setFilterFrom(parsed.rangeFrom);
    setFilterTo(parsed.rangeTo);
    if (canPickBranch && parsed.branchId) {
      setFilterBranch(parsed.branchId);
      writeManagerScopeBranchId(parsed.branchId);
    }
  }, [location.search, searchParams, canPickBranch]);

  const syncFiltersToUrl = useCallback(
    (next: {
      filterEmployee?: string;
      filterStatus?: string;
      filterDay?: string;
      dateViewMode?: TaskDateViewMode;
      filterFrom?: string;
      filterTo?: string;
      filterBranch?: string;
    }) => {
      const branchId = canPickBranch
        ? (next.filterBranch ?? filterBranch)
        : undefined;
      navigate(
        buildManagerTasksPath({
          branchId,
          employeeId: next.filterEmployee ?? filterEmployee,
          status: next.filterStatus ?? filterStatus,
          dueOn: next.filterDay ?? filterDay,
          dateViewMode: next.dateViewMode ?? dateViewMode,
          rangeFrom: next.filterFrom ?? filterFrom,
          rangeTo: next.filterTo ?? filterTo,
        }),
        { replace: true }
      );
    },
    [
      navigate,
      canPickBranch,
      filterBranch,
      filterEmployee,
      filterStatus,
      filterDay,
      dateViewMode,
      filterFrom,
      filterTo,
    ]
  );

  useEffect(() => {
    // Wait until team is loaded — otherwise deep-link ?employee= is cleared too early.
    if (loading || employees.length === 0) return;
    if (filterEmployee && !filterEmployees.some((u) => u.id === filterEmployee)) {
      setFilterEmployee("");
      syncFiltersToUrl({ filterEmployee: "" });
    }
  }, [filterEmployee, filterEmployees, loading, employees.length, syncFiltersToUrl]);


  const tasksBasePath = location.pathname.startsWith("/admin") ? "/admin/tasks" : "/manager/tasks";
  useLegacyCreateRedirect(tasksBasePath);

  /** Toujours confirmé : la suppression part maintenant de la fiche de la tâche. */
  const handleCancel = (task: TaskOccurrence) => {
    setEditOccurrenceId(null);
    setDeleting(task);
    setDeleteAllBranches(canPickBranch && isNetworkAdHocOccurrence(task, networkIds)
      ? defaultApplyAdHocEditToNetwork(task, canPickBranch, networkIds)
      : false);
  };

  const confirmCancel = async (task: TaskOccurrence, applyToNetwork: boolean) => {
    try {
      const res = await taskService.cancel(task.id, applyToNetwork);
      showSuccess(he.managerAdHocDeletedNetwork(res.deleted_count ?? 1));
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      await confirmCancel(deleting, deleteAllBranches);
      setDeleting(null);
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleSetManagerNext = async (task: TaskOccurrence, enabled: boolean) => {
    try {
      const res = await taskService.setManagerNext(task.id, enabled);
      showSuccess(res.message || (enabled ? he.managerNextTaskSet : he.managerNextTaskCleared));
      await load(true);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  /** Preuve à valider → revue plein écran ; tâche fermée → son résumé ; sinon la fiche. */
  const openTask = (task: TaskOccurrence) => {
    if (task.status === "pending_review") {
      setReviewRequest({ startId: task.id, queue: reviewQueueFromTasks(displayedOccurrences) });
    } else if (dashboardTaskUsesReview(task.status)) {
      setReviewTarget(task);
    } else {
      setEditOccurrenceId(task.id);
    }
  };

  const moveDay = (delta: number) => {
    const day = shiftDay(filterDay, delta);
    setFilterDay(day);
    setDateViewMode("day");
    syncFiltersToUrl({ filterDay: day, dateViewMode: "day" });
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {user?.role === "admin" ? <AdminNewTaskButton onClick={() => navigate(`${tasksBasePath}/new`)} /> : null}
      {canPickBranch ? (
        <ManagerScopePicker
          value={filterBranch}
          branches={branches}
          onChange={(value) => {
            setFilterBranch(value);
            writeManagerScopeBranchId(value);
            syncFiltersToUrl({ filterBranch: value });
          }}
        />
      ) : null}
      <ManagerTasksFilters
        employees={filterEmployees.map((u) => ({ value: u.id, label: u.full_name }))}
        statuses={MANAGER_TASK_STATUS_FILTERS.map((value) => ({ value, label: he.taskStatusLabels[value] }))}
        employeeId={filterEmployee}
        status={filterStatus}
        dayLabel={dateViewMode === "day" ? dayNavLabel(filterDay) : `${formatHebrewDayNoYear(filterFrom)} – ${formatHebrewDayNoYear(filterTo)}`}
        onEmployee={(value) => {
          setFilterEmployee(value);
          syncFiltersToUrl({ filterEmployee: value });
        }}
        onStatus={(value) => {
          setFilterStatus(value);
          syncFiltersToUrl({ filterStatus: value });
        }}
        onPrevDay={() => moveDay(-1)}
        onNextDay={() => moveDay(1)}
      />

      {loading ? (
        <ListSkeleton variant="cards" rows={6} />
      ) : (
        <ManagerTasksDayBoard
          groups={groupTasksByPeriod(displayedOccurrences)}
          shownDay={dateViewMode === "day" ? filterDay : ""}
          emptyText={filterEmployee || filterStatus ? he.managerTasksEmptyFiltered : he.managerTasksEmpty}
          onOpen={openTask}
        />
      )}

      <ManagerReviewScreen
        request={reviewRequest}
        onClose={() => setReviewRequest(null)}
        onDone={(message) => {
          if (message) showSuccess(message);
          void load(true);
        }}
      />

      <TaskCompletionReviewDialog
        task={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={(message) => {
          showSuccess(message);
          void load(true);
        }}
      />

      <TaskOccurrenceEditDialog
        occurrenceId={editOccurrenceId}
        employees={employees}
        onClose={() => setEditOccurrenceId(null)}
        onSaved={() => {
          void load(true);
        }}
        footer={canManageTasks ? (task) => (
          <ManagerTaskEditFooter
            task={occurrences.find((o) => o.id === task.id) ?? task}
            onSetManagerNext={handleSetManagerNext}
            onDelete={handleCancel}
          />
        ) : undefined}
      />

      <ConfirmDeleteDialog
        open={Boolean(deleting)}
        title={he.managerAdHocDelete}
        itemName={deleting?.title}
        message={he.managerAdHocDeleteConfirm}
        optionLabel={
          deleting && canPickBranch && isNetworkAdHocOccurrence(deleting, networkIds)
            ? he.managerFixedTasksDeleteAllBranches
            : undefined
        }
        optionChecked={deleteAllBranches}
        onOptionChange={setDeleteAllBranches}
        saving={deleteSaving}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </Box>
  );
}
