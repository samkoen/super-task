import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import TaskOccurrenceGridByDay from "../../components/tasks/TaskOccurrenceGridByDay";
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
import SavedFiltersBar from "../../components/filters/SavedFiltersBar";
import TaskDateViewBar from "../../components/filters/TaskDateViewBar";
import PageHeader from "../../components/ui/PageHeader";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { managerTasksSavedFiltersClient } from "../../services/savedFiltersStorage";
import { useFeedback } from "../../context/FeedbackContext";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import {
  datetimeLocalForNewTask,
  defaultRangeFrom,
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
import { userBelongsToBranch } from "../../utils/userBranchMembership";
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
  networkAdHocChipLabel,
  networkAdHocIds,
} from "../../utils/adHocNetworkTasks";
import { he } from "../../i18n/he";
import { resolveTaskCompletionGuides } from "../../utils/resolveTaskCompletionGuides";

const SAVED_FILTERS_EXPANDED_KEY = "super:saved-filters:manager_tasks:expanded";

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
  const [filterBranch, setFilterBranch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterDay, setFilterDay] = useState(() => todayIso());
  const [dateViewMode, setDateViewMode] = useState<TaskDateViewMode>("day");
  const [filterFrom, setFilterFrom] = useState(() => todayIso());
  const [filterTo, setFilterTo] = useState(() => defaultRangeFrom(todayIso(), 7).to);
  const [activeSavedFilterId, setActiveSavedFilterId] = useState<string | null>(null);

  const isBranchManager = user?.role === "branch_manager";
  const isNetworkManager = user?.role === "network_manager";
  const canManageTasks = isBranchManager || isNetworkManager || user?.role === "admin";
  const canPickBranch = isNetworkManager || user?.role === "admin";

  const scopeBranchId = useMemo(() => {
    if (canPickBranch) return filterBranch;
    return user?.branch_id ?? "";
  }, [canPickBranch, filterBranch, user?.branch_id]);

  const filterEmployees = useMemo(
    () => (scopeBranchId ? employees.filter((u) => userBelongsToBranch(u, scopeBranchId)) : employees),
    [employees, scopeBranchId]
  );

  const displayedOccurrences = useMemo(
    () => filterManagerTaskOccurrences(occurrences, { employeeId: filterEmployee, status: filterStatus }),
    [occurrences, filterEmployee, filterStatus],
  );
  const networkIds = useMemo(() => networkAdHocIds(occurrences), [occurrences]);

  const hasListFilters = Boolean(filterEmployee || filterStatus || filterBranch);

  const loadInFlight = useRef(false);
  const load = useCallback(async (silent = false) => {
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const branchId = scopeBranchId || undefined;
      const dateParams =
        dateViewMode === "day"
          ? { due_on: filterDay }
          : { due_from: filterFrom, due_to: filterTo };
      // Afficher la liste dès que les occurrences arrivent (ne pas attendre branches/équipe).
      const occ = await taskService.listOccurrences({ branch_id: branchId, ...dateParams });
      setOccurrences(occ);
      if (!silent) setLoading(false);
      void Promise.all([branchService.list(), userService.listTeam("employee")])
        .then(([branchList, team]) => {
          setBranches(branchList);
          setEmployees(team);
        })
        .catch(() => {
          /* filtres incomplets — la liste reste utilisable */
        });
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      if (!silent) setLoading(false);
    } finally {
      loadInFlight.current = false;
    }
  }, [scopeBranchId, filterDay, filterFrom, filterTo, dateViewMode, showError]);

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
    setActiveSavedFilterId(null);
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

  const currentFilters = useMemo(
    () => ({
      ...(canPickBranch ? { filterBranch } : {}),
      filterEmployee,
      filterStatus,
      filterDay,
      dateViewMode,
      filterFrom,
      filterTo,
    }),
    [canPickBranch, filterBranch, filterEmployee, filterStatus, filterDay, dateViewMode, filterFrom, filterTo]
  );

  const handleSelectSavedFilter = (item: { id: string; filters: Record<string, string | number> }) => {
    if (canPickBranch) {
      setFilterBranch(String(item.filters.filterBranch ?? ""));
    }
    setFilterEmployee(String(item.filters.filterEmployee ?? ""));
    setFilterStatus(String(item.filters.filterStatus ?? ""));
    setFilterDay(String(item.filters.filterDay ?? todayIso()));
    setDateViewMode((item.filters.dateViewMode as TaskDateViewMode) ?? "day");
    setFilterFrom(String(item.filters.filterFrom ?? todayIso()));
    setFilterTo(String(item.filters.filterTo ?? defaultRangeFrom(todayIso(), 7).to));
    setActiveSavedFilterId(item.id);
  };

  const resetSavedFilterActive = () => setActiveSavedFilterId(null);

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

  const startNewTask = () => {
    setPhotoStepOpen(true);
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
          weekly_days: item.weekly_days || undefined,
          monthly_day: item.monthly_day ?? undefined,
          assignee_user_id,
          source_gallery_item_id: item.id,
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

  const handleCancel = (task: TaskOccurrence) => {
    if (canPickBranch && isNetworkAdHocOccurrence(task, networkIds)) {
      setDeleting(task);
      setDeleteAllBranches(defaultApplyAdHocEditToNetwork(task, canPickBranch, networkIds));
      return;
    }
    void confirmCancel(task, false);
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

  const handleOpenEdit = (task: TaskOccurrence) => {
    setEditOccurrenceId(task.id);
  };

  return (
    <Box>
      <PageHeader
        title={he.managerTasks}
        subtitle={
          isBranchManager && user?.branch_name
            ? `${he.branch}: ${user.branch_name}`
            : he.managerTasksSubtitle
        }
        action={
          <Box display="flex" gap={1} flexWrap="wrap">
            <Button variant="contained" startIcon={<AddIcon />} onClick={startNewTask}>
              {he.newTask}
            </Button>
            <Button
              variant="outlined"
              startIcon={<CollectionsBookmarkIcon />}
              onClick={() => setGalleryPickerOpen(true)}
            >
              {he.newTaskFromGallery}
            </Button>
          </Box>
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <TaskDateViewBar
          mode={dateViewMode}
          onModeChange={(mode) => {
            setDateViewMode(mode);
            resetSavedFilterActive();
            syncFiltersToUrl({ dateViewMode: mode });
          }}
          day={filterDay}
          onDayChange={(day) => {
            setFilterDay(day);
            resetSavedFilterActive();
            syncFiltersToUrl({ filterDay: day });
          }}
          rangeFrom={filterFrom}
          rangeTo={filterTo}
          onRangeChange={(from, to) => {
            setFilterFrom(from);
            setFilterTo(to);
            resetSavedFilterActive();
            syncFiltersToUrl({ filterFrom: from, filterTo: to, dateViewMode: "range" });
          }}
          trailing={
            <>
              {canPickBranch && (
                <TextField
                  select
                  size="small"
                  label={he.branch}
                  value={filterBranch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFilterBranch(value);
                    setActiveSavedFilterId(null);
                    writeManagerScopeBranchId(value);
                    syncFiltersToUrl({ filterBranch: value });
                  }}
                  sx={{ minWidth: 140 }}
                >
                  <MenuItem value="">{he.all}</MenuItem>
                  {branches.map((s) => (
                    <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                size="small"
                label={he.filterByEmployee}
                value={filterEmployee}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterEmployee(value);
                  setActiveSavedFilterId(null);
                  syncFiltersToUrl({ filterEmployee: value });
                }}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">{he.all}</MenuItem>
                {filterEmployees.map((u) => (
                  <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label={he.filterByStatus}
                value={filterStatus}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilterStatus(value);
                  setActiveSavedFilterId(null);
                  if (value === "overdue") {
                    const parsed = parseManagerTasksSearchParams(
                      new URLSearchParams(`status=overdue&due_on=${filterDay}`)
                    );
                    setDateViewMode(parsed.dateViewMode);
                    setFilterFrom(parsed.rangeFrom);
                    setFilterTo(parsed.rangeTo);
                    syncFiltersToUrl({
                      filterStatus: value,
                      dateViewMode: parsed.dateViewMode,
                      filterFrom: parsed.rangeFrom,
                      filterTo: parsed.rangeTo,
                    });
                  } else {
                    syncFiltersToUrl({ filterStatus: value });
                  }
                }}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">{he.all}</MenuItem>
                {MANAGER_TASK_STATUS_FILTERS.map((status) => (
                  <MenuItem key={status} value={status}>
                    {he.taskStatusLabels[status]}
                  </MenuItem>
                ))}
              </TextField>
            </>
          }
        />
        <SavedFiltersBar
          filterClient={managerTasksSavedFiltersClient}
          storageKeyExpanded={SAVED_FILTERS_EXPANDED_KEY}
          filters={currentFilters}
          activeSavedFilterId={activeSavedFilterId}
          onSelectSaved={handleSelectSavedFilter}
          onActiveFilterRemoved={() => setActiveSavedFilterId(null)}
        />
      </Paper>

      {loading ? (
        <ListSkeleton variant="cards" rows={6} />
      ) : dateViewMode === "range" ? (
        <TaskOccurrenceGridByDay
          tasks={displayedOccurrences}
          emptyMessage={hasListFilters ? he.noTasksFiltered : he.noTasks}
          emptyDescription={hasListFilters ? he.noTasksFilteredHint : he.noTasksHint}
          isBranchManager={isBranchManager}
          onEdit={canManageTasks ? handleOpenEdit : undefined}
          onCancel={canManageTasks ? handleCancel : undefined}
          onReview={canManageTasks ? setReviewTarget : undefined}
          onSetManagerNext={canManageTasks ? handleSetManagerNext : undefined}
          onChatUpdated={canManageTasks ? () => void load(true) : undefined}
          networkChipFor={(task) =>
            networkAdHocChipLabel(task, displayedOccurrences, branches.length)
          }
        />
      ) : (
        <TaskOccurrenceGrid
          tasks={displayedOccurrences}
          emptyMessage={hasListFilters ? he.noTasksFiltered : he.noTasks}
          emptyDescription={hasListFilters ? he.noTasksFilteredHint : he.noTasksHint}
          isBranchManager={isBranchManager}
          onEdit={canManageTasks ? handleOpenEdit : undefined}
          onCancel={canManageTasks ? handleCancel : undefined}
          onReview={canManageTasks ? setReviewTarget : undefined}
          onSetManagerNext={canManageTasks ? handleSetManagerNext : undefined}
          onChatUpdated={canManageTasks ? () => void load(true) : undefined}
          networkChipFor={(task) =>
            networkAdHocChipLabel(task, displayedOccurrences, branches.length)
          }
        />
      )}

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
      />

      <TaskOccurrenceEditDialog
        occurrenceId={editOccurrenceId}
        employees={employees}
        onClose={() => setEditOccurrenceId(null)}
        onSaved={() => {
          void load(true);
        }}
      />

      <Dialog
        open={Boolean(deleting)}
        onClose={() => !deleteSaving && setDeleting(null)}
        fullWidth
        maxWidth="xs"
        dir="rtl"
      >
        <DialogTitle>{he.managerAdHocDelete}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
          <Typography>{he.managerAdHocDeleteConfirm}</Typography>
          {deleting && canPickBranch && isNetworkAdHocOccurrence(deleting, networkIds) && (
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteAllBranches}
                  onChange={(e) => setDeleteAllBranches(e.target.checked)}
                  disabled={deleteSaving}
                />
              }
              label={he.managerFixedTasksDeleteAllBranches}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleting(null)} disabled={deleteSaving}>{he.cancel}</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteSaving}
          >
            {he.taskDeleteConfirm}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
