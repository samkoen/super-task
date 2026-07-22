import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  DialogTitle,
  MenuItem,
  Paper,
  Switch,
  TextField,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import TaskOccurrenceGridByDay from "../../components/tasks/TaskOccurrenceGridByDay";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskGalleryPickerDialog from "../../components/tasks/TaskGalleryPickerDialog";
import GalleryQuickAssignDialog, {
  type GalleryQuickAssignPayload,
} from "../../components/tasks/GalleryQuickAssignDialog";
import NewTaskPhotoStep from "../../components/tasks/NewTaskPhotoStep";
import NewTaskFormDialog, {
  type NewTaskFormSubmitPayload,
} from "../../components/tasks/NewTaskFormDialog";
import { taskGalleryService, type TaskGalleryItem } from "../../services/taskGalleryService";
import TaskReferenceMediaEditor, {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import TaskChatPanel from "../../components/tasks/TaskChatPanel";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
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
  toDatetimeLocal,
  type TaskDateViewMode,
} from "../../utils/dateView";
import {
  buildManagerTasksPath,
  filterManagerTaskOccurrences,
  MANAGER_TASK_STATUS_FILTERS,
  parseManagerTasksSearchParams,
} from "../../utils/managerTaskFilters";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { mediaFromPhotoFile, revokeTaskMediaBlobs } from "../../utils/newTaskMedia";
import { ASSIGN_TO_GALLERY, isAssignToGallery } from "../../constants/taskAssignment";
import { he } from "../../i18n/he";

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
  const [editTarget, setEditTarget] = useState<TaskOccurrence | null>(null);
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editReferenceMediaDirty, setEditReferenceMediaDirty] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    due_at: "",
    assignee_user_id: "",
    photo_required: true,
    reference_photo_url: "",
    reference_video_url: "",
    reference_audio_url: "",
    pending_photo: null as File | null,
    pending_video: null as File | null,
  });
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
    () => (scopeBranchId ? employees.filter((u) => u.branch_id === scopeBranchId) : employees),
    [employees, scopeBranchId]
  );

  const displayedOccurrences = useMemo(
    () => filterManagerTaskOccurrences(occurrences, { employeeId: filterEmployee, status: filterStatus }),
    [occurrences, filterEmployee, filterStatus]
  );

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
    setActiveSavedFilterId(null);
  }, [location.search, searchParams]);

  const syncFiltersToUrl = useCallback(
    (next: {
      filterEmployee?: string;
      filterStatus?: string;
      filterDay?: string;
      dateViewMode?: TaskDateViewMode;
      filterFrom?: string;
      filterTo?: string;
    }) => {
      navigate(
        buildManagerTasksPath({
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
    [navigate, filterEmployee, filterStatus, filterDay, dateViewMode, filterFrom, filterTo]
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
      if (isAssignToGallery(payload.assignee_user_id)) {
        const res = await taskGalleryService.create({
          branch_id: payload.branch_id,
          title,
          description: payload.description,
          task_kind: payload.task_kind,
          recurrence: payload.task_kind === "fixed" ? payload.recurrence : null,
          due_time: payload.task_kind === "fixed" ? payload.due_time : null,
          weekly_days:
            payload.task_kind === "fixed" &&
            (payload.recurrence === "weekly" || payload.recurrence === "biweekly")
              ? payload.weekly_days
              : null,
          monthly_day:
            payload.task_kind === "fixed" && payload.recurrence === "monthly"
              ? payload.monthly_day
              : null,
          photo_required: true,
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
          branch_id: payload.branch_id,
          title,
          description: payload.description,
          recurrence: payload.recurrence,
          due_time: payload.due_time,
          weekly_days:
            payload.recurrence === "weekly" || payload.recurrence === "biweekly"
              ? payload.weekly_days
              : undefined,
          monthly_day: payload.recurrence === "monthly" ? payload.monthly_day : undefined,
          assignee_user_id: payload.assignee_user_id,
          ops_category: payload.ops_category,
          ...media,
        });
        revokeTaskMediaBlobs(formMedia);
        setFormOpen(false);
        setFormMedia(EMPTY_REFERENCE_MEDIA);
        setFormPrefill(undefined);
        showSuccess(res.message);
      } else {
        const res = await taskService.createAdHoc({
          branch_id: payload.branch_id,
          title,
          description: payload.description,
          due_at: new Date(payload.due_at).toISOString(),
          assignee_user_id: payload.assignee_user_id,
          photo_required: true,
          ...media,
        });
        revokeTaskMediaBlobs(formMedia);
        setFormOpen(false);
        setFormMedia(EMPTY_REFERENCE_MEDIA);
        setFormPrefill(undefined);
        showSuccess(res.message);
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
          recurrence: (item.recurrence as "daily" | "weekly" | "biweekly" | "monthly") || "daily",
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

  const handleCancel = async (task: TaskOccurrence) => {
    try {
      await taskService.cancel(task.id);
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
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

  const handleOpenEdit = async (task: TaskOccurrence) => {
    setEditTarget(null);
    setEditLoading(true);
    setEditReferenceMediaDirty(false);
    try {
      const fresh = await taskService.getOccurrence(task.id);
      setEditTarget(fresh);
      setEditForm({
        title: fresh.title,
        description: fresh.description,
        due_at: toDatetimeLocal(fresh.due_at),
        assignee_user_id: fresh.assignee_user_id ?? "",
        photo_required: fresh.photo_required,
        reference_photo_url: fresh.reference_photo_url ?? "",
        reference_video_url: fresh.reference_video_url ?? "",
        reference_audio_url: fresh.reference_audio_url ?? "",
        pending_photo: null,
        pending_video: null,
      });
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const moveToGallery = isAssignToGallery(editForm.assignee_user_id);
      const payload: Parameters<typeof taskService.updateOccurrence>[1] = {
        title: editForm.title.trim(),
        description: editForm.description,
        due_at: new Date(editForm.due_at).toISOString(),
        assignee_user_id: moveToGallery
          ? editTarget.assignee_user_id || undefined
          : editForm.assignee_user_id || undefined,
        photo_required: editTarget.task_kind === "ad_hoc" ? editForm.photo_required : undefined,
      };
      if (editReferenceMediaDirty) {
        const media = await resolveTaskReferenceMedia(editForm);
        payload.reference_photo_url = media.reference_photo_url || null;
        payload.reference_video_url = media.reference_video_url || null;
        payload.reference_audio_url = media.reference_audio_url || null;
      }
      await taskService.updateOccurrence(editTarget.id, payload);
      if (moveToGallery) {
        await taskGalleryService.createFromOccurrence(editTarget.id);
        await taskService.cancel(editTarget.id);
        setEditTarget(null);
        setEditReferenceMediaDirty(false);
        showSuccess(he.taskMovedToGallery);
      } else {
        setEditTarget(null);
        setEditReferenceMediaDirty(false);
        showSuccess(he.taskUpdated);
      }
      await load();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const editEmployees = useMemo(
    () => (editTarget ? employees.filter((u) => u.branch_id === editTarget.branch_id) : employees),
    [employees, editTarget]
  );

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
                    setFilterBranch(e.target.value);
                    setActiveSavedFilterId(null);
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

      <Dialog
        open={!!editTarget || editLoading}
        onClose={() => {
          if (saving || editLoading) return;
          setEditTarget(null);
          setEditLoading(false);
        }}
        fullWidth
        maxWidth="sm"
        dir="rtl"
      >
        <DialogTitle>{he.editTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {editLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : editTarget ? (
            <>
          <TextField
            label={he.taskTitle}
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={he.description}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
          <TextField
            label={he.dueAt}
            type="datetime-local"
            value={editForm.due_at}
            onChange={(e) => setEditForm({ ...editForm, due_at: e.target.value })}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            dir="ltr"
          />
          {(isBranchManager || Boolean(editForm.assignee_user_id)) && (
            <TextField
              select
              label={he.assignee}
              value={editForm.assignee_user_id}
              onChange={(e) => setEditForm({ ...editForm, assignee_user_id: e.target.value })}
              required={editTarget?.task_kind === "ad_hoc"}
              fullWidth
              helperText={
                isAssignToGallery(editForm.assignee_user_id) ? he.assignToGalleryHint : undefined
              }
            >
              {editTarget?.can_add_to_gallery !== false && (
                <MenuItem value={ASSIGN_TO_GALLERY}>
                  <Box component="span" fontWeight={700}>{he.assignToGallery}</Box>
                </MenuItem>
              )}
              <MenuItem value="">{he.noAssignee}</MenuItem>
              {editEmployees.map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
            </TextField>
          )}
          {editTarget?.task_kind === "ad_hoc" && (
            <FormControlLabel
              control={
                <Switch
                  checked={editForm.photo_required}
                  onChange={(e) => setEditForm({ ...editForm, photo_required: e.target.checked })}
                />
              }
              label={he.photoRequired}
            />
          )}
          <TaskReferenceMediaEditor
            key={editTarget?.id}
            value={{
              reference_photo_url: editForm.reference_photo_url,
              reference_video_url: editForm.reference_video_url,
              reference_audio_url: editForm.reference_audio_url,
              pending_photo: editForm.pending_photo,
              pending_video: editForm.pending_video,
            }}
            onChange={(media) => {
              setEditReferenceMediaDirty(true);
              setEditForm({
                ...editForm,
                reference_photo_url: media.reference_photo_url,
                reference_video_url: media.reference_video_url,
                reference_audio_url: media.reference_audio_url,
                pending_photo: media.pending_photo ?? null,
                pending_video: media.pending_video ?? null,
              });
            }}
            onDescriptionAppend={(transcript) =>
              setEditForm((f) => ({ ...f, description: appendDescriptionBlock(f.description, transcript) }))
            }
            disabled={saving}
            onError={showError}
          />
          <TaskChatPanel
            key={`chat-${editTarget.id}`}
            occurrenceId={editTarget.id}
            compact
            composeEnabled={canComposeTaskChat(editTarget.status, false)}
            onOccurrenceUpdated={() => {
              showSuccess(he.taskChatSent);
              void load(true);
            }}
          />
            </>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setEditTarget(null);
              setEditLoading(false);
            }}
            disabled={saving || editLoading}
          >
            {he.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSaveEdit()}
            disabled={saving || editLoading || !editForm.title.trim() || !editForm.due_at}
          >
            {saving ? <CircularProgress size={22} /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
