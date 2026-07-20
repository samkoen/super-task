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
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import TaskOccurrenceGridByDay from "../../components/tasks/TaskOccurrenceGridByDay";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskCreationModeDialog, {
  type TaskCreationMode,
} from "../../components/tasks/TaskCreationModeDialog";
import TaskGalleryPickerDialog from "../../components/tasks/TaskGalleryPickerDialog";
import TaskVoiceCreationDialog from "../../components/tasks/TaskVoiceCreationDialog";
import { taskGalleryService, type TaskGalleryItem } from "../../services/taskGalleryService";
import type { TaskVoiceFillResult } from "../../components/ai/TaskVoiceAssistant";
import TaskReferenceMediaEditor, {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import SavedFiltersBar from "../../components/filters/SavedFiltersBar";
import TaskDateViewBar from "../../components/filters/TaskDateViewBar";
import PageHeader from "../../components/ui/PageHeader";
import ListSkeleton from "../../components/ui/ListSkeleton";
import { managerTasksSavedFiltersClient } from "../../services/savedFiltersStorage";
import { useFeedback } from "../../context/FeedbackContext";
import type { AdHocTaskPrefillFromIssue } from "../../utils/issueReportTaskPrefill";
import {
  datetimeLocalForDay,
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
import {
  taskService,
  type TaskOccurrence,
  type TaskRecurrence,
} from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
import { adHocDialogTitle } from "../../utils/adHocDialogTitle";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { he } from "../../i18n/he";

const RECURRENCES: TaskRecurrence[] = ["daily", "weekly", "biweekly", "monthly"];
const SAVED_FILTERS_EXPANDED_KEY = "super:saved-filters:manager_tasks:expanded";
const WEEKDAYS = [
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
  { value: "6", label: he.weekdaySun },
];

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
  const [openFixed, setOpenFixed] = useState(false);
  const [openAdHoc, setOpenAdHoc] = useState(false);
  const [creationPicker, setCreationPicker] = useState<"fixed" | "ad_hoc" | null>(null);
  const [voiceCreation, setVoiceCreation] = useState<"fixed" | "ad_hoc" | null>(null);
  const [galleryPicker, setGalleryPicker] = useState<"fixed" | "ad_hoc" | null>(null);
  const [gallerySourceId, setGallerySourceId] = useState<string | null>(null);
  const [voiceBranchId, setVoiceBranchId] = useState("");
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

  const [fixedForm, setFixedForm] = useState({
    branch_id: "",
    title: "",
    description: "",
    recurrence: "daily" as TaskRecurrence,
    due_time: "09:00",
    weekly_days: "0",
    monthly_day: 1,
    assignee_user_id: "",
  });

  const [adHocForm, setAdHocForm] = useState({
    branch_id: "",
    title: "",
    description: "",
    due_at: "",
    assignee_user_id: "",
  });

  const [fixedReferenceMedia, setFixedReferenceMedia] = useState<TaskReferenceMediaValue>(
    EMPTY_REFERENCE_MEDIA
  );
  const [adHocReferenceMedia, setAdHocReferenceMedia] = useState<TaskReferenceMediaValue>(
    EMPTY_REFERENCE_MEDIA
  );

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

  const filteredEmployees = useMemo(
    () => (fixedForm.branch_id ? employees.filter((u) => u.branch_id === fixedForm.branch_id) : employees),
    [employees, fixedForm.branch_id]
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
    if (user?.branch_id) {
      setFixedForm((f) => ({ ...f, branch_id: user.branch_id ?? "" }));
      setAdHocForm((f) => ({ ...f, branch_id: user.branch_id ?? "" }));
    }
  }, [user]);

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

  const handleOpenFixedForm = (prefill?: TaskVoiceFillResult) => {
    setGallerySourceId(null);
    setFixedForm((f) => ({
      ...f,
      branch_id: voiceBranchId || scopeBranchId || user?.branch_id || f.branch_id,
      title: prefill?.title ?? "",
      description: prefill?.description ?? "",
      assignee_user_id: prefill?.assignee_user_id || f.assignee_user_id,
    }));
    setFixedReferenceMedia(EMPTY_REFERENCE_MEDIA);
    setOpenFixed(true);
  };

  const handleOpenAdHocForm = (
    prefill?: TaskVoiceFillResult,
    media?: TaskReferenceMediaValue,
    options?: { branch_id?: string; assignee_user_id?: string; keepGallerySource?: boolean }
  ) => {
    if (!options?.keepGallerySource) {
      setGallerySourceId(null);
    }
    setAdHocForm({
      branch_id: options?.branch_id || voiceBranchId || scopeBranchId || user?.branch_id || "",
      title: prefill?.title ?? "",
      description: prefill?.description ?? "",
      due_at: datetimeLocalForDay(dateViewMode === "day" ? filterDay : filterFrom),
      assignee_user_id:
        options?.assignee_user_id
        || (isBranchManager && filterEmployee ? filterEmployee : "")
        || prefill?.assignee_user_id
        || "",
    });
    setAdHocReferenceMedia(media ?? EMPTY_REFERENCE_MEDIA);
    setOpenAdHoc(true);
  };

  useEffect(() => {
    const state = location.state as { adHocPrefillFromIssue?: AdHocTaskPrefillFromIssue } | null;
    const fromIssue = state?.adHocPrefillFromIssue;
    if (!fromIssue) return;
    handleOpenAdHocForm(
      { title: fromIssue.title, description: fromIssue.description, assignee_user_id: fromIssue.assignee_user_id },
      {
        reference_photo_url: fromIssue.reference_photo_url,
        reference_video_url: fromIssue.reference_video_url,
        reference_audio_url: fromIssue.reference_audio_url,
      },
      { branch_id: fromIssue.branch_id, assignee_user_id: fromIssue.assignee_user_id }
    );
    navigate(location.pathname, { replace: true, state: {} });
    // Intentionally once when arriving from דיווחי תקלות
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleCreationModeSelect = (mode: TaskCreationMode) => {
    if (!creationPicker) return;
    const kind = creationPicker;
    setCreationPicker(null);
    const branchId = scopeBranchId || user?.branch_id || "";
    setVoiceBranchId(branchId);
    if (mode === "voice") {
      setVoiceCreation(kind);
      return;
    }
    if (mode === "gallery") {
      setGalleryPicker(kind);
      return;
    }
    if (kind === "fixed") {
      handleOpenFixedForm();
    } else {
      handleOpenAdHocForm();
    }
  };

  const handleGalleryPicked = (item: TaskGalleryItem) => {
    const kind = galleryPicker;
    setGalleryPicker(null);
    setGallerySourceId(item.id);
    const media: TaskReferenceMediaValue = {
      reference_photo_url: item.reference_photo_url ?? "",
      reference_video_url: item.reference_video_url ?? "",
      reference_audio_url: item.reference_audio_url ?? "",
    };
    const prefill = {
      title: item.title,
      description: item.description,
      assignee_user_id: "",
    };
    if (kind === "fixed") {
      setFixedForm((f) => ({
        ...f,
        branch_id: voiceBranchId || scopeBranchId || user?.branch_id || f.branch_id,
        title: item.title,
        description: item.description,
        recurrence: (item.recurrence as TaskRecurrence) || "daily",
        due_time: item.due_time || "09:00",
        weekly_days: item.weekly_days || "0",
        monthly_day: item.monthly_day ?? 1,
      }));
      setFixedReferenceMedia(media);
      setOpenFixed(true);
      return;
    }
    handleOpenAdHocForm(prefill, media, { keepGallerySource: true });
  };

  const handleAddToGallery = async (task: TaskOccurrence) => {
    try {
      const res = await taskGalleryService.createFromOccurrence(task.id);
      showSuccess(res.message || he.taskGalleryAdded);
      await load(true);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const handleVoiceFilled = (data: TaskVoiceFillResult) => {
    if (voiceCreation === "fixed") {
      handleOpenFixedForm(data);
    } else if (voiceCreation === "ad_hoc") {
      handleOpenAdHocForm(data);
    }
    setVoiceCreation(null);
  };

  const handleCreateFixed = async () => {
    setSaving(true);
    try {
      const title = await ensureTaskTitle(fixedForm.title, fixedForm.description);
      setFixedForm((f) => ({ ...f, title }));
      const media = await resolveTaskReferenceMedia(fixedReferenceMedia);
      const res = await taskService.createTemplate({
        ...fixedForm,
        title,
        weekly_days:
          fixedForm.recurrence === "weekly" || fixedForm.recurrence === "biweekly"
            ? fixedForm.weekly_days
            : undefined,
        monthly_day: fixedForm.recurrence === "monthly" ? fixedForm.monthly_day : undefined,
        source_gallery_item_id: gallerySourceId || undefined,
        ...media,
      });
      setOpenFixed(false);
      setGallerySourceId(null);
      setFixedReferenceMedia(EMPTY_REFERENCE_MEDIA);
      showSuccess(res.message);
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

  const handleOpenAdHoc = () => {
    setCreationPicker("ad_hoc");
  };

  const handleCreateAdHoc = async () => {
    setSaving(true);
    try {
      const title = await ensureTaskTitle(adHocForm.title, adHocForm.description);
      setAdHocForm((f) => ({ ...f, title }));
      const media = await resolveTaskReferenceMedia(adHocReferenceMedia);
      const res = await taskService.createAdHoc({
        branch_id: adHocForm.branch_id,
        title,
        description: adHocForm.description,
        due_at: new Date(adHocForm.due_at).toISOString(),
        assignee_user_id: adHocForm.assignee_user_id || undefined,
        photo_required: true,
        source_gallery_item_id: gallerySourceId || undefined,
        ...media,
      });
      setOpenAdHoc(false);
      setGallerySourceId(null);
      setAdHocReferenceMedia(EMPTY_REFERENCE_MEDIA);
      showSuccess(res.message);
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

  const handleCancel = async (task: TaskOccurrence) => {
    try {
      await taskService.cancel(task.id);
      await load();
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
      const payload: Parameters<typeof taskService.updateOccurrence>[1] = {
        title: editForm.title.trim(),
        description: editForm.description,
        due_at: new Date(editForm.due_at).toISOString(),
        assignee_user_id: editForm.assignee_user_id || undefined,
        photo_required: editTarget.task_kind === "ad_hoc" ? editForm.photo_required : undefined,
      };
      if (editReferenceMediaDirty) {
        const media = await resolveTaskReferenceMedia(editForm);
        payload.reference_photo_url = media.reference_photo_url || null;
        payload.reference_video_url = media.reference_video_url || null;
        payload.reference_audio_url = media.reference_audio_url || null;
      }
      const res = await taskService.updateOccurrence(editTarget.id, payload);
      setEditTarget(null);
      setEditReferenceMediaDirty(false);
      showSuccess(res.message);
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

  const adHocBranchName =
    branches.find((b) => b.id === adHocForm.branch_id)?.name
    || user?.branch_name
    || "";

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
            {isBranchManager && (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreationPicker("fixed")}>
                {he.newFixedTask}
              </Button>
            )}
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdHoc}>
              {he.newAdHocTask}
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
          onCancel={handleCancel}
          onReview={canManageTasks ? setReviewTarget : undefined}
          onAddToGallery={canManageTasks ? handleAddToGallery : undefined}
        />
      ) : (
        <TaskOccurrenceGrid
          tasks={displayedOccurrences}
          emptyMessage={hasListFilters ? he.noTasksFiltered : he.noTasks}
          emptyDescription={hasListFilters ? he.noTasksFilteredHint : he.noTasksHint}
          isBranchManager={isBranchManager}
          onEdit={canManageTasks ? handleOpenEdit : undefined}
          onCancel={handleCancel}
          onReview={canManageTasks ? setReviewTarget : undefined}
          onAddToGallery={canManageTasks ? handleAddToGallery : undefined}
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

      <TaskCreationModeDialog
        open={creationPicker !== null}
        title={creationPicker === "fixed" ? he.newFixedTask : he.newAdHocTask}
        onClose={() => setCreationPicker(null)}
        onSelect={handleCreationModeSelect}
      />

      <TaskGalleryPickerDialog
        open={galleryPicker !== null}
        taskKind={galleryPicker === "fixed" ? "fixed" : "ad_hoc"}
        onClose={() => setGalleryPicker(null)}
        onSelect={handleGalleryPicked}
      />

      <TaskVoiceCreationDialog
        open={voiceCreation !== null}
        taskKind={voiceCreation === "fixed" ? "fixed" : "ad_hoc"}
        branchId={voiceBranchId}
        branches={branches}
        isBranchManager={isBranchManager}
        onBranchChange={setVoiceBranchId}
        onClose={() => setVoiceCreation(null)}
        onFilled={handleVoiceFilled}
        onError={showError}
      />

      <Dialog open={openFixed} onClose={() => setOpenFixed(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newFixedTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={fixedForm.branch_id} onChange={(e) => setFixedForm({ ...fixedForm, branch_id: e.target.value })} required fullWidth disabled={isBranchManager}>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField
            label={he.taskTitle}
            value={fixedForm.title}
            onChange={(e) => setFixedForm({ ...fixedForm, title: e.target.value })}
            helperText={he.taskTitleOptionalHint}
            fullWidth
          />
          <TextField label={he.description} value={fixedForm.description} onChange={(e) => setFixedForm({ ...fixedForm, description: e.target.value })} multiline rows={2} fullWidth />
          <TextField select label={he.assignee} value={fixedForm.assignee_user_id} onChange={(e) => setFixedForm({ ...fixedForm, assignee_user_id: e.target.value })} required fullWidth>
            {filteredEmployees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
          <TextField select label={he.recurrence} value={fixedForm.recurrence} onChange={(e) => setFixedForm({ ...fixedForm, recurrence: e.target.value as TaskRecurrence })} fullWidth>
            {RECURRENCES.map((r) => <MenuItem key={r} value={r}>{he.recurrenceLabels[r]}</MenuItem>)}
          </TextField>
          <TextField label={he.dueTime} type="time" value={fixedForm.due_time} onChange={(e) => setFixedForm({ ...fixedForm, due_time: e.target.value })} InputLabelProps={{ shrink: true }} fullWidth dir="ltr" />
          {(fixedForm.recurrence === "weekly" || fixedForm.recurrence === "biweekly") && (
            <TextField select label={he.weekday} value={fixedForm.weekly_days} onChange={(e) => setFixedForm({ ...fixedForm, weekly_days: e.target.value })} fullWidth>
              {WEEKDAYS.map((d) => <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>)}
            </TextField>
          )}
          {fixedForm.recurrence === "monthly" && (
            <TextField
              select
              label={he.monthlyDay}
              value={String(fixedForm.monthly_day)}
              onChange={(e) => setFixedForm({ ...fixedForm, monthly_day: Number(e.target.value) })}
              fullWidth
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <MenuItem key={day} value={String(day)}>{day}</MenuItem>
              ))}
            </TextField>
          )}
          <TaskReferenceMediaEditor
            value={fixedReferenceMedia}
            onChange={setFixedReferenceMedia}
            onDescriptionAppend={(transcript) =>
              setFixedForm((f) => ({ ...f, description: appendDescriptionBlock(f.description, transcript) }))
            }
            disabled={saving}
            onError={showError}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenFixed(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreateFixed} disabled={saving}>{saving ? <CircularProgress size={22} /> : he.submit}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAdHoc} onClose={() => setOpenAdHoc(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>
          {adHocDialogTitle(he.newAdHocTask, adHocBranchName, {
            showBranchBesideTitle: isBranchManager,
          })}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!isBranchManager && (
            <TextField
              select
              label={he.branch}
              value={adHocForm.branch_id}
              onChange={(e) => setAdHocForm({ ...adHocForm, branch_id: e.target.value })}
              required
              fullWidth
            >
              {branches.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            label={he.taskTitle}
            value={adHocForm.title}
            onChange={(e) => setAdHocForm({ ...adHocForm, title: e.target.value })}
            helperText={he.taskTitleOptionalHint}
            fullWidth
          />
          <TextField label={he.description} value={adHocForm.description} onChange={(e) => setAdHocForm({ ...adHocForm, description: e.target.value })} multiline rows={2} fullWidth />
          <TextField label={he.dueAt} type="datetime-local" value={adHocForm.due_at} onChange={(e) => setAdHocForm({ ...adHocForm, due_at: e.target.value })} InputLabelProps={{ shrink: true }} required fullWidth dir="ltr" />
          <TextField
            select
            label={he.assignee}
            value={adHocForm.assignee_user_id}
            onChange={(e) => setAdHocForm({ ...adHocForm, assignee_user_id: e.target.value })}
            required
            fullWidth
          >
            {employees
              .filter((u) => !adHocForm.branch_id || u.branch_id === adHocForm.branch_id)
              .map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
          </TextField>
          <TaskReferenceMediaEditor
            value={adHocReferenceMedia}
            onChange={setAdHocReferenceMedia}
            onDescriptionAppend={(transcript) =>
              setAdHocForm((f) => ({ ...f, description: appendDescriptionBlock(f.description, transcript) }))
            }
            disabled={saving}
            onError={showError}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAdHoc(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreateAdHoc} disabled={saving}>{saving ? <CircularProgress size={22} /> : he.submit}</Button>
        </DialogActions>
      </Dialog>

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
            >
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
