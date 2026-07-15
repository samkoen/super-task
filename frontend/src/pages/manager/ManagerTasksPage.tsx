import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  FormControlLabel,
  DialogTitle,
  MenuItem,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { ApiError, type User } from "../../services/api";
import { branchService, type Branch } from "../../services/branchService";
import TaskOccurrenceGrid from "../../components/tasks/TaskOccurrenceGrid";
import TaskOccurrenceGridByDay from "../../components/tasks/TaskOccurrenceGridByDay";
import TaskCompletionReviewDialog from "../../components/tasks/TaskCompletionReviewDialog";
import TaskCreationModeDialog from "../../components/tasks/TaskCreationModeDialog";
import TaskVoiceCreationDialog from "../../components/tasks/TaskVoiceCreationDialog";
import type { TaskVoiceFillResult } from "../../components/ai/TaskVoiceAssistant";
import TaskReferenceMediaEditor, {
  type TaskReferenceMediaValue,
} from "../../components/tasks/TaskReferenceMediaEditor";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import SavedFiltersBar from "../../components/filters/SavedFiltersBar";
import TaskDateViewBar from "../../components/filters/TaskDateViewBar";
import { managerTasksSavedFiltersClient } from "../../services/savedFiltersStorage";
import {
  datetimeLocalForDay,
  defaultRangeFrom,
  todayIso,
  toDatetimeLocal,
  type TaskDateViewMode,
} from "../../utils/dateView";
import {
  taskService,
  type TaskOccurrence,
  type TaskRecurrence,
} from "../../services/taskService";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";
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
  const [tab, setTab] = useState(0);
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [pending, setPending] = useState<TaskOccurrence[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [openFixed, setOpenFixed] = useState(false);
  const [openAdHoc, setOpenAdHoc] = useState(false);
  const [creationPicker, setCreationPicker] = useState<"fixed" | "ad_hoc" | null>(null);
  const [voiceCreation, setVoiceCreation] = useState<"fixed" | "ad_hoc" | null>(null);
  const [voiceBranchId, setVoiceBranchId] = useState("");
  const [delegateTarget, setDelegateTarget] = useState<TaskOccurrence | null>(null);
  const [delegateAssignee, setDelegateAssignee] = useState("");
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
  });
  const [saving, setSaving] = useState(false);
  const [filterBranch, setFilterBranch] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterDay, setFilterDay] = useState(todayIso);
  const [dateViewMode, setDateViewMode] = useState<TaskDateViewMode>("day");
  const [filterFrom, setFilterFrom] = useState(todayIso);
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

  const filterByAssignee = useCallback(
    (rows: TaskOccurrence[]) => {
      if (!filterEmployee) return rows;
      return rows.filter((o) => o.assignee_user_id === filterEmployee);
    },
    [filterEmployee]
  );

  const displayedOccurrences = useMemo(
    () => filterByAssignee(occurrences),
    [occurrences, filterByAssignee]
  );

  const displayedPending = useMemo(
    () => (filterEmployee ? [] : pending),
    [pending, filterEmployee]
  );

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const branchId = scopeBranchId || undefined;
      const dateParams =
        dateViewMode === "day"
          ? { due_on: filterDay }
          : { due_from: filterFrom, due_to: filterTo };
      const [occ, pend, branchList, team] = await Promise.all([
        taskService.listOccurrences({ branch_id: branchId, ...dateParams }),
        isBranchManager ? taskService.listOccurrences({ pending_delegation: true, branch_id: branchId }) : Promise.resolve([]),
        branchService.list(),
        userService.listTeam("employee"),
      ]);
      setOccurrences(occ);
      setPending(pend);
      setBranches(branchList);
      setEmployees(team);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scopeBranchId, filterDay, filterFrom, filterTo, dateViewMode, isBranchManager]);

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
    if (filterEmployee && !filterEmployees.some((u) => u.id === filterEmployee)) {
      setFilterEmployee("");
    }
  }, [filterEmployee, filterEmployees]);

  const currentFilters = useMemo(
    () => ({
      ...(canPickBranch ? { filterBranch } : {}),
      filterEmployee,
      filterDay,
      dateViewMode,
      filterFrom,
      filterTo,
    }),
    [canPickBranch, filterBranch, filterEmployee, filterDay, dateViewMode, filterFrom, filterTo]
  );

  const handleSelectSavedFilter = (item: { id: string; filters: Record<string, string | number> }) => {
    if (canPickBranch) {
      setFilterBranch(String(item.filters.filterBranch ?? ""));
    }
    setFilterEmployee(String(item.filters.filterEmployee ?? ""));
    setFilterDay(String(item.filters.filterDay ?? todayIso()));
    setDateViewMode((item.filters.dateViewMode as TaskDateViewMode) ?? "day");
    setFilterFrom(String(item.filters.filterFrom ?? todayIso()));
    setFilterTo(String(item.filters.filterTo ?? defaultRangeFrom(todayIso(), 7).to));
    setActiveSavedFilterId(item.id);
  };

  const resetSavedFilterActive = () => setActiveSavedFilterId(null);

  const handleOpenFixedForm = (prefill?: TaskVoiceFillResult) => {
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

  const handleOpenAdHocForm = (prefill?: TaskVoiceFillResult) => {
    setAdHocForm({
      branch_id: voiceBranchId || scopeBranchId || user?.branch_id || "",
      title: prefill?.title ?? "",
      description: prefill?.description ?? "",
      due_at: datetimeLocalForDay(dateViewMode === "day" ? filterDay : filterFrom),
      assignee_user_id: isBranchManager && filterEmployee ? filterEmployee : prefill?.assignee_user_id ?? "",
    });
    setAdHocReferenceMedia(EMPTY_REFERENCE_MEDIA);
    setOpenAdHoc(true);
  };

  const handleCreationModeSelect = (mode: "manual" | "voice") => {
    if (!creationPicker) return;
    const kind = creationPicker;
    setCreationPicker(null);
    const branchId = scopeBranchId || user?.branch_id || "";
    setVoiceBranchId(branchId);
    if (mode === "voice") {
      setVoiceCreation(kind);
      return;
    }
    if (kind === "fixed") {
      handleOpenFixedForm();
    } else {
      handleOpenAdHocForm();
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
      const res = await taskService.createTemplate({
        ...fixedForm,
        weekly_days:
          fixedForm.recurrence === "weekly" || fixedForm.recurrence === "biweekly"
            ? fixedForm.weekly_days
            : undefined,
        monthly_day: fixedForm.recurrence === "monthly" ? fixedForm.monthly_day : undefined,
        reference_photo_url: fixedReferenceMedia.reference_photo_url || undefined,
        reference_video_url: fixedReferenceMedia.reference_video_url || undefined,
        reference_audio_url: fixedReferenceMedia.reference_audio_url || undefined,
      });
      setOpenFixed(false);
      setFixedReferenceMedia(EMPTY_REFERENCE_MEDIA);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
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
      const res = await taskService.createAdHoc({
        branch_id: adHocForm.branch_id,
        title: adHocForm.title,
        description: adHocForm.description,
        due_at: new Date(adHocForm.due_at).toISOString(),
        assignee_user_id: isBranchManager ? adHocForm.assignee_user_id || undefined : undefined,
        photo_required: true,
        reference_photo_url: adHocReferenceMedia.reference_photo_url || undefined,
        reference_video_url: adHocReferenceMedia.reference_video_url || undefined,
        reference_audio_url: adHocReferenceMedia.reference_audio_url || undefined,
      });
      setOpenAdHoc(false);
      setAdHocReferenceMedia(EMPTY_REFERENCE_MEDIA);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleDelegate = async () => {
    if (!delegateTarget) return;
    setSaving(true);
    try {
      await taskService.delegate(delegateTarget.id, delegateAssignee);
      setDelegateTarget(null);
      setDelegateAssignee("");
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (task: TaskOccurrence) => {
    setError("");
    try {
      await taskService.cancel(task.id);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const handleOpenEdit = async (task: TaskOccurrence) => {
    setEditTarget(null);
    setEditLoading(true);
    setError("");
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
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    setError("");
    try {
      const payload: Parameters<typeof taskService.updateOccurrence>[1] = {
        title: editForm.title.trim(),
        description: editForm.description,
        due_at: new Date(editForm.due_at).toISOString(),
        assignee_user_id: editForm.assignee_user_id || undefined,
        photo_required: editTarget.task_kind === "ad_hoc" ? editForm.photo_required : undefined,
      };
      if (editReferenceMediaDirty) {
        payload.reference_photo_url = editForm.reference_photo_url || null;
        payload.reference_video_url = editForm.reference_video_url || null;
        payload.reference_audio_url = editForm.reference_audio_url || null;
      }
      const res = await taskService.updateOccurrence(editTarget.id, payload);
      setEditTarget(null);
      setEditReferenceMediaDirty(false);
      setSuccess(res.message);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={700}>{he.managerTasks}</Typography>
          <Typography variant="body2" color="text.secondary">
            {isBranchManager && user?.branch_name
              ? `${he.branch}: ${user.branch_name}`
              : he.managerTasksSubtitle}
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          {canPickBranch && (
            <TextField select size="small" label={he.branch} value={filterBranch} onChange={(e) => { setFilterBranch(e.target.value); setActiveSavedFilterId(null); }} sx={{ minWidth: 160 }}>
              <MenuItem value="">{he.all}</MenuItem>
              {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </TextField>
          )}
          <TextField select size="small" label={he.filterByEmployee} value={filterEmployee} onChange={(e) => { setFilterEmployee(e.target.value); setActiveSavedFilterId(null); }} sx={{ minWidth: 180 }}>
            <MenuItem value="">{he.all}</MenuItem>
            {filterEmployees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
          {isBranchManager && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreationPicker("fixed")}>{he.newFixedTask}</Button>
          )}
          <Button variant="outlined" startIcon={<AddIcon />} onClick={handleOpenAdHoc}>{he.newAdHocTask}</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>{success}</Alert>}

      <TaskDateViewBar
        mode={dateViewMode}
        onModeChange={(mode) => {
          setDateViewMode(mode);
          resetSavedFilterActive();
        }}
        day={filterDay}
        onDayChange={(day) => {
          setFilterDay(day);
          resetSavedFilterActive();
        }}
        rangeFrom={filterFrom}
        rangeTo={filterTo}
        onRangeChange={(from, to) => {
          setFilterFrom(from);
          setFilterTo(to);
          resetSavedFilterActive();
        }}
      />

      <SavedFiltersBar
        filterClient={managerTasksSavedFiltersClient}
        storageKeyExpanded={SAVED_FILTERS_EXPANDED_KEY}
        filters={currentFilters}
        activeSavedFilterId={activeSavedFilterId}
        onSelectSaved={handleSelectSavedFilter}
        onActiveFilterRemoved={() => setActiveSavedFilterId(null)}
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`${he.allTasks} (${displayedOccurrences.length})`} />
        {isBranchManager && <Tab label={`${he.pendingDelegation} (${displayedPending.length})`} />}
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : tab === 0 ? (
        dateViewMode === "range" ? (
          <TaskOccurrenceGridByDay
            tasks={displayedOccurrences}
            isBranchManager={isBranchManager}
            onDelegate={(task) => { setDelegateTarget(task); setDelegateAssignee(""); }}
            onEdit={canManageTasks ? handleOpenEdit : undefined}
            onCancel={handleCancel}
            onReview={canManageTasks ? setReviewTarget : undefined}
          />
        ) : (
          <TaskOccurrenceGrid
            tasks={displayedOccurrences}
            isBranchManager={isBranchManager}
            onDelegate={(task) => { setDelegateTarget(task); setDelegateAssignee(""); }}
            onEdit={canManageTasks ? handleOpenEdit : undefined}
            onCancel={handleCancel}
            onReview={canManageTasks ? setReviewTarget : undefined}
          />
        )
      ) : (
        <TaskOccurrenceGrid
          tasks={displayedPending}
          emptyMessage={filterEmployee ? he.noTasks : he.noTasks}
          isBranchManager={isBranchManager}
          onDelegate={(task) => { setDelegateTarget(task); setDelegateAssignee(""); }}
          onEdit={canManageTasks ? handleOpenEdit : undefined}
          onReview={canManageTasks ? setReviewTarget : undefined}
        />
      )}

      <TaskCompletionReviewDialog
        task={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={(message) => {
          setSuccess(message);
          void load(true);
        }}
      />

      <TaskCreationModeDialog
        open={creationPicker !== null}
        title={creationPicker === "fixed" ? he.newFixedTask : he.newAdHocTask}
        onClose={() => setCreationPicker(null)}
        onSelect={handleCreationModeSelect}
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
        onError={setError}
      />

      <Dialog open={openFixed} onClose={() => setOpenFixed(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newFixedTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={fixedForm.branch_id} onChange={(e) => setFixedForm({ ...fixedForm, branch_id: e.target.value })} required fullWidth disabled={isBranchManager}>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label={he.taskTitle} value={fixedForm.title} onChange={(e) => setFixedForm({ ...fixedForm, title: e.target.value })} required fullWidth />
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
            onError={setError}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenFixed(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleCreateFixed} disabled={saving}>{saving ? <CircularProgress size={22} /> : he.submit}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openAdHoc} onClose={() => setOpenAdHoc(false)} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newAdHocTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField select label={he.branch} value={adHocForm.branch_id} onChange={(e) => setAdHocForm({ ...adHocForm, branch_id: e.target.value })} required fullWidth disabled={isBranchManager}>
            {branches.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
          <TextField label={he.taskTitle} value={adHocForm.title} onChange={(e) => setAdHocForm({ ...adHocForm, title: e.target.value })} required fullWidth />
          <TextField label={he.description} value={adHocForm.description} onChange={(e) => setAdHocForm({ ...adHocForm, description: e.target.value })} multiline rows={2} fullWidth />
          <TextField label={he.dueAt} type="datetime-local" value={adHocForm.due_at} onChange={(e) => setAdHocForm({ ...adHocForm, due_at: e.target.value })} InputLabelProps={{ shrink: true }} required fullWidth dir="ltr" />
          {isBranchManager && (
            <TextField select label={he.assignee} value={adHocForm.assignee_user_id} onChange={(e) => setAdHocForm({ ...adHocForm, assignee_user_id: e.target.value })} required fullWidth>
              {employees.filter((u) => u.branch_id === adHocForm.branch_id).map((u) => (
                <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
              ))}
            </TextField>
          )}
          {isNetworkManager && (
            <Alert severity="info">{he.adHocNetworkManagerHint}</Alert>
          )}
          <TaskReferenceMediaEditor
            value={adHocReferenceMedia}
            onChange={setAdHocReferenceMedia}
            onDescriptionAppend={(transcript) =>
              setAdHocForm((f) => ({ ...f, description: appendDescriptionBlock(f.description, transcript) }))
            }
            disabled={saving}
            onError={setError}
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
              required={isBranchManager && editTarget?.task_kind === "ad_hoc" && !editTarget.pending_delegation}
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
            }}
            onChange={(media) => {
              setEditReferenceMediaDirty(true);
              setEditForm({
                ...editForm,
                reference_photo_url: media.reference_photo_url,
                reference_video_url: media.reference_video_url,
                reference_audio_url: media.reference_audio_url,
              });
            }}
            onDescriptionAppend={(transcript) =>
              setEditForm((f) => ({ ...f, description: appendDescriptionBlock(f.description, transcript) }))
            }
            disabled={saving}
            onError={setError}
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

      <Dialog open={!!delegateTarget} onClose={() => setDelegateTarget(null)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.delegateTask}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" mb={2}>{delegateTarget?.title}</Typography>
          <TextField select label={he.assignee} value={delegateAssignee} onChange={(e) => setDelegateAssignee(e.target.value)} fullWidth required>
            {employees.map((u) => <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDelegateTarget(null)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={handleDelegate} disabled={saving || !delegateAssignee}>{he.delegateTask}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
