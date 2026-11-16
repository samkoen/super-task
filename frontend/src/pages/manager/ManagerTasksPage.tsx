import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Box } from "@mui/material";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import ManagerScopePicker from "../../components/dashboard/home/ManagerScopePicker";
import ManagerReviewScreen, { type ManagerReviewRequest } from "../../components/review/ManagerReviewScreen";
import ManagerTaskEditFooter from "../../components/tasks/today/ManagerTaskEditFooter";
import ManagerTasksDayBoard from "../../components/tasks/today/ManagerTasksDayBoard";
import ManagerTasksFilters from "../../components/tasks/today/ManagerTasksFilters";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskOccurrenceEditDialog from "../../components/tasks/TaskOccurrenceEditDialog";
import TaskGalleryPickerDialog from "../../components/tasks/TaskGalleryPickerDialog";
import GalleryQuickAssignDialog, {
  type GalleryQuickAssignPayload,
} from "../../components/tasks/GalleryQuickAssignDialog";
import NewTaskPhotoStep from "../../components/tasks/NewTaskPhotoStep";
import NewTaskFormDialog, {
  type NewTaskFormSubmitPayload,
} from "../../components/tasks/NewTaskFormDialog";
import { taskGalleryService, type TaskGalleryItem } from "../../services/taskGalleryService";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import ConfirmDeleteDialog from "../../components/ui/ConfirmDeleteDialog";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { useFeedback } from "../../context/FeedbackContext";
import { useManagerPageHeader } from "../../context/ManagerPageHeaderContext";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import {
  datetimeLocalForNewTask,
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
import { writeManagerScopeBranchId } from "../../utils/managerScopeBranch";
import { dashboardTaskUsesReview } from "../../utils/dashboardTaskOpen";
import { dayNavLabel, groupTasksByPeriod, reviewQueueFromTasks } from "../../utils/managerTasksDay";
import { userBelongsToBranch } from "../../utils/userBranchMembership";
import { withSelfAssignee } from "../../utils/assigneeOptions";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { mediaFromPhotoFile, revokeTaskMediaBlobs } from "../../utils/newTaskMedia";
import { isAssignToGallery } from "../../constants/taskAssignment";
import { groupedCreateApiFields } from "../../utils/fixedTaskCreateScope";
import { weeklyDaysPayload, normalizeFixedRecurrence } from "../../utils/taskRecurrence";
import {
  defaultApplyAdHocEditToNetwork,
  isNetworkAdHocOccurrence,
  networkAdHocIds,
} from "../../utils/adHocNetworkTasks";
import { he } from "../../i18n/he";
import { resolveTaskCompletionGuides } from "../../utils/resolveTaskCompletionGuides";

const EMPTY_REFERENCE_MEDIA: TaskReferenceMediaValue = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

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
  const [photoStepOpen, setPhotoStepOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMedia, setFormMedia] = useState<TaskReferenceMediaValue>(EMPTY_REFERENCE_MEDIA);
  const [formPrefill, setFormPrefill] = useState<
    | (Partial<Pick<NewTaskFormSubmitPayload, "title" | "description" | "assignee_user_id">> & {
        branch_id?: string;
      })
    | undefined
  >(undefined);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [galleryAssignItem, setGalleryAssignItem] = useState<TaskGalleryItem | null>(null);
  const [editOccurrenceId, setEditOccurrenceId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);
  const [deleting, setDeleting] = useState<TaskOccurrence | null>(null);
  const [deleteAllBranches, setDeleteAllBranches] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [saving, setSaving] = useState(false);
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


  const defaultDueAt = datetimeLocalForNewTask(
    dateViewMode === "day" ? filterDay : filterFrom,
  );

  const openNewTaskForm = (
    media?: TaskReferenceMediaValue,
    prefill?: Partial<Pick<NewTaskFormSubmitPayload, "title" | "description" | "assignee_user_id">> & {
      branch_id?: string;
    },
  ) => {
    setFormMedia(media ?? EMPTY_REFERENCE_MEDIA);
    setFormPrefill(prefill);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    revokeTaskMediaBlobs(formMedia);
    setFormOpen(false);
    setFormMedia(EMPTY_REFERENCE_MEDIA);
    setFormPrefill(undefined);
  };

  useEffect(() => {
    const state = location.state as {
      adHocPrefillFromIssue?: AdHocTaskPrefillFromIssue;
      openNewTask?: boolean;
      openGalleryTask?: boolean;
    } | null;
    if (!state) return;
    if (state.openGalleryTask) {
      setGalleryPickerOpen(true);
      navigate(location.pathname + location.search, { replace: true, state: {} });
      return;
    }
    if (state.openNewTask) {
      setPhotoStepOpen(true);
      navigate(location.pathname + location.search, { replace: true, state: {} });
      return;
    }
    const fromIssue = state.adHocPrefillFromIssue;
    if (!fromIssue) return;
    openNewTaskForm(
      {
        reference_photo_url: fromIssue.reference_photo_url,
        reference_video_url: fromIssue.reference_video_url,
        reference_audio_url: fromIssue.reference_audio_url,
      },
      {
        title: fromIssue.title,
        description: fromIssue.description,
        assignee_user_id: fromIssue.assignee_user_id,
        branch_id: fromIssue.branch_id,
      },
    );
    navigate(location.pathname + location.search, { replace: true, state: {} });
    // Intentionally once when arriving with navigation state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleCreateTask = async (payload: NewTaskFormSubmitPayload) => {
    setSaving(true);
    try {
      const title = await ensureTaskTitle(payload.title, payload.description);
      const media = await resolveTaskReferenceMedia(payload.media);
      const completion_requirements = await resolveTaskCompletionGuides(
        payload.completion_requirements,
      );
      if (isAssignToGallery(payload.assignee_user_id)) {
        const res = await taskGalleryService.create({
          branch_id: payload.branch_id,
          title,
          description: payload.description,
          task_kind: payload.task_kind,
          recurrence: payload.task_kind === "fixed" ? payload.recurrence : null,
          due_time: payload.task_kind === "fixed" ? payload.due_time : null,
          weekly_days:
            payload.task_kind === "fixed"
              ? weeklyDaysPayload(payload.recurrence, payload.weekly_days) ?? null
              : null,
          monthly_day:
            payload.task_kind === "fixed" && payload.recurrence === "monthly"
              ? payload.monthly_day
              : null,
          photo_required: true,
          completion_requirements,
          ...media,
          start_url: payload.start_url,
        });
        revokeTaskMediaBlobs(formMedia);
        setFormOpen(false);
        setFormMedia(EMPTY_REFERENCE_MEDIA);
        setFormPrefill(undefined);
        showSuccess(res.message || he.taskGalleryAdded);
        await load();
        return;
      }
      if (payload.task_kind === "fixed") {
        const res = await taskService.createTemplate({
          ...groupedCreateApiFields(payload),
          title,
          description: payload.description,
          recurrence: payload.recurrence,
          due_time: payload.due_time,
          weekly_days: weeklyDaysPayload(payload.recurrence, payload.weekly_days),
          monthly_day: payload.recurrence === "monthly" ? payload.monthly_day : undefined,
          ops_category: payload.ops_category,
          min_video_seconds: payload.min_video_seconds,
          completion_requirements,
          is_work_start: payload.is_work_start,
          is_work_end: payload.is_work_end,
          start_url: payload.start_url,
          opened_by_delivery_note: payload.opened_by_delivery_note,
          delivery_note_task_type: payload.delivery_note_task_type,
          ...media,
        });
        revokeTaskMediaBlobs(formMedia);
        setFormOpen(false);
        setFormMedia(EMPTY_REFERENCE_MEDIA);
        setFormPrefill(undefined);
        const createdCount = res.templates?.length ?? (res.template ? 1 : 0);
        showSuccess(
          payload.apply_to_network
            ? he.managerFixedTasksCreatedNetwork(createdCount)
            : res.message,
        );
      } else {
        const res = await taskService.createAdHoc({
          ...groupedCreateApiFields(payload),
          title,
          description: payload.description,
          due_at: new Date(payload.due_at).toISOString(),
          photo_required: true,
          min_video_seconds: payload.min_video_seconds,
          completion_requirements,
          start_url: payload.start_url,
          ...media,
        });
        revokeTaskMediaBlobs(formMedia);
        setFormOpen(false);
        setFormMedia(EMPTY_REFERENCE_MEDIA);
        setFormPrefill(undefined);
        const createdCount = res.occurrences?.length ?? (res.occurrence ? 1 : 0);
        showSuccess(
          payload.apply_to_network
            ? he.managerAdHocCreatedNetwork(createdCount)
            : res.message,
        );
      }
      await load();
    } catch (e) {
      if (e instanceof Error && e.message === "TITLE_OR_DESCRIPTION_REQUIRED") {
        showError(he.taskTitleOrDescriptionRequired);
      } else {
        showError(e instanceof ApiError ? e.message : he.errorGeneric);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleGalleryQuickAssign = async ({
    item,
    branch_id,
    assignee_user_id,
    due_at,
  }: GalleryQuickAssignPayload) => {
    setSaving(true);
    try {
      const media = {
        reference_photo_url: item.reference_photo_url || undefined,
        reference_video_url: item.reference_video_url || undefined,
        reference_audio_url: item.reference_audio_url || undefined,
      };
      if (item.task_kind === "fixed") {
        const res = await taskService.createTemplate({
          branch_id,
          title: item.title,
          description: item.description,
          recurrence: normalizeFixedRecurrence(item.recurrence),
          due_time: item.due_time || "09:00",
          weekly_days: weeklyDaysPayload(
            normalizeFixedRecurrence(item.recurrence),
            item.weekly_days,
          ),
          monthly_day: item.monthly_day ?? undefined,
          assignee_user_id,
          source_gallery_item_id: item.id,
          start_url: item.start_url,
          ...media,
        });
        showSuccess(res.message);
      } else {
        const res = await taskService.createAdHoc({
          branch_id,
          title: item.title,
          description: item.description,
          due_at: new Date(due_at).toISOString(),
          assignee_user_id,
          photo_required: true,
          source_gallery_item_id: item.id,
          start_url: item.start_url,
          ...media,
        });
        showSuccess(res.message);
      }
      setGalleryAssignItem(null);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

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

      <NewTaskPhotoStep
        open={photoStepOpen}
        onClose={() => setPhotoStepOpen(false)}
        onSkip={() => {
          setPhotoStepOpen(false);
          openNewTaskForm();
        }}
        onPhoto={(file) => {
          setPhotoStepOpen(false);
          openNewTaskForm(mediaFromPhotoFile(file));
        }}
      />

      <NewTaskFormDialog
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleCreateTask}
        forcedTaskKind="ad_hoc"
        branches={branches}
        employees={employees}
        isBranchManager={isBranchManager}
        canPickBranch={canPickBranch}
        defaultBranchId={formPrefill?.branch_id || scopeBranchId || user?.branch_id || ""}
        defaultDueAt={defaultDueAt}
        defaultAssigneeId={
          formPrefill?.assignee_user_id
          || (isBranchManager && filterEmployee ? filterEmployee : "")
        }
        initialMedia={formMedia}
        initialPrefill={formPrefill}
        saving={saving}
        onError={showError}
        currentUserId={user?.id}
      />

      <TaskGalleryPickerDialog
        open={galleryPickerOpen}
        onClose={() => setGalleryPickerOpen(false)}
        onSelect={(item) => {
          setGalleryPickerOpen(false);
          setGalleryAssignItem(item);
        }}
      />

      <GalleryQuickAssignDialog
        open={galleryAssignItem !== null}
        item={galleryAssignItem}
        branches={branches}
        employees={employees}
        canPickBranch={canPickBranch}
        defaultBranchId={scopeBranchId || user?.branch_id || ""}
        defaultDueAt={defaultDueAt}
        saving={saving}
        onClose={() => setGalleryAssignItem(null)}
        onSubmit={handleGalleryQuickAssign}
        currentUserId={user?.id}
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
