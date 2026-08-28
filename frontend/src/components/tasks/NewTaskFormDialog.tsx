import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { User } from "../../services/api";
import type { Branch } from "../../services/branchService";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
import BranchChecklist from "./BranchChecklist";
import TaskReferenceMediaEditor, {
  type TaskReferenceMediaValue,
} from "./TaskReferenceMediaEditor";
import WeekdayMultiSelect from "./WeekdayMultiSelect";
import { applyReferenceTranscript } from "../../utils/applyReferenceTranscript";
import { ASSIGN_TO_GALLERY, isAssignToGallery } from "../../constants/taskAssignment";
import { OPS_CATEGORIES, type OpsCategory, type TaskRecurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { userBelongsToBranch } from "../../utils/userBranchMembership";
import type { CompletionRequirement } from "../../utils/completionMedia";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import {
  createFieldsFromBranchSelection,
} from "../../utils/fixedTaskCreateScope";
import {
  DAILY_DEFAULT_WEEKDAYS,
  FIXED_RECURRENCE_OPTIONS,
  weekdaysOnRecurrenceChange,
} from "../../utils/taskRecurrence";
import { startUrlFieldError } from "../../utils/startUrl";

const EMPTY_MEDIA: TaskReferenceMediaValue = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

export type NewTaskKind = "ad_hoc" | "fixed";

export interface NewTaskFormSubmitPayload {
  task_kind: NewTaskKind;
  branch_id: string;
  title: string;
  description: string;
  assignee_user_id: string;
  due_at: string;
  recurrence: TaskRecurrence;
  due_time: string;
  weekly_days: string;
  monthly_day: number;
  media: TaskReferenceMediaValue;
  ops_category?: OpsCategory | null;
  apply_to_network?: boolean;
  branch_ids?: string[];
  min_video_seconds?: number | null;
  completion_requirements?: CompletionRequirement[];
  is_work_start?: boolean;
  is_work_end?: boolean;
  start_url?: string | null;
}

export interface NewTaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: NewTaskFormSubmitPayload) => Promise<void>;
  branches: Branch[];
  employees: User[];
  isBranchManager: boolean;
  canPickBranch: boolean;
  defaultBranchId: string;
  defaultDueAt: string;
  defaultAssigneeId?: string;
  lockAssignee?: boolean;
  /** Force le type (ex. page משימות קבועות). */
  forcedTaskKind?: NewTaskKind;
  initialMedia?: TaskReferenceMediaValue;
  /** Prefill titre/description/assignee (ex. issue report). */
  initialPrefill?: Partial<Pick<NewTaskFormSubmitPayload, "title" | "description" | "assignee_user_id">>;
  saving?: boolean;
  onError?: (message: string) => void;
}

export default function NewTaskFormDialog({
  open,
  onClose,
  onSubmit,
  branches,
  employees,
  isBranchManager,
  canPickBranch,
  defaultBranchId,
  defaultDueAt,
  defaultAssigneeId = "",
  lockAssignee = false,
  forcedTaskKind,
  initialMedia,
  initialPrefill,
  saving = false,
  onError,
}: NewTaskFormDialogProps) {
  const [taskKind, setTaskKind] = useState<NewTaskKind>(forcedTaskKind ?? "ad_hoc");
  const [branchId, setBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("daily");
  const [dueTime, setDueTime] = useState("09:00");
  const [weeklyDays, setWeeklyDays] = useState(DAILY_DEFAULT_WEEKDAYS);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [opsCategory, setOpsCategory] = useState<OpsCategory | "">("");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [completionRequirements, setCompletionRequirements] = useState<CompletionRequirement[]>([]);
  const [isWorkStart, setIsWorkStart] = useState(false);
  const [isWorkEnd, setIsWorkEnd] = useState(false);
  const [startUrl, setStartUrl] = useState("");
  const [media, setMedia] = useState<TaskReferenceMediaValue>(EMPTY_MEDIA);
  const [localError, setLocalError] = useState("");
  const wasOpenRef = useRef(false);

  // Reset UNIQUEMENT à l'ouverture (pas à chaque re-render parent / dueAt / employees).
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setTaskKind(forcedTaskKind ?? "ad_hoc");
    setBranchId(defaultBranchId);
    setTitle(initialPrefill?.title ?? "");
    setDescription(initialPrefill?.description ?? "");
    setAssigneeUserId(
      initialPrefill?.assignee_user_id || defaultAssigneeId || "",
    );
    setDueAt(defaultDueAt);
    setRecurrence("daily");
    setDueTime("09:00");
    setWeeklyDays(DAILY_DEFAULT_WEEKDAYS);
    setMonthlyDay(1);
    setOpsCategory("");
    setSelectedBranchIds(defaultBranchId ? [defaultBranchId] : []);
    setCompletionRequirements([]);
    setIsWorkStart(false);
    setIsWorkEnd(false);
    setStartUrl("");
    setMedia(initialMedia ?? EMPTY_MEDIA);
    setLocalError("");
    // Snapshot à l'ouverture seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const allBranchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const branchScope = canPickBranch
    ? createFieldsFromBranchSelection(selectedBranchIds, allBranchIds)
    : { grouped: false, apply_to_network: false, branch_id: branchId };
  const groupedCreate = branchScope.grouped;
  const effectiveBranchId = branchScope.branch_id || branchId;

  const branchEmployees = useMemo(() => {
    const base = effectiveBranchId
      ? employees.filter((u) => userBelongsToBranch(u, effectiveBranchId))
      : employees;
    if (
      assigneeUserId &&
      !isAssignToGallery(assigneeUserId) &&
      !base.some((u) => u.id === assigneeUserId)
    ) {
      const hit = employees.find((u) => u.id === assigneeUserId);
      if (hit) return [hit, ...base];
    }
    return base;
  }, [employees, effectiveBranchId, assigneeUserId]);

  const branchName =
    branches.find((b) => b.id === effectiveBranchId)?.name || "";

  const fieldsRef = useRef({ title, description, assigneeUserId, employees, lockAssignee });
  fieldsRef.current = { title, description, assigneeUserId, employees, lockAssignee };

  const handleReferenceTranscript = async (transcript: string) => {
    const current = fieldsRef.current;
    try {
      const applied = await applyReferenceTranscript({
        transcript,
        currentTitle: current.title,
        currentDescription: current.description,
        currentAssigneeId: current.assigneeUserId,
        employees: current.employees.map((u) => ({ id: u.id, full_name: u.full_name })),
        lockAssignee: current.lockAssignee,
      });
      setDescription(applied.description);
      setTitle(applied.title);
      if (applied.assigneeMatched) {
        setAssigneeUserId(applied.assignee_user_id);
        setLocalError("");
      }
    } catch {
      /* keep current fields if title AI fails mid-flight */
    }
  };

  const toGallery = isAssignToGallery(assigneeUserId);

  const handleSubmit = async () => {
    const urlErr = startUrlFieldError(startUrl);
    if (urlErr) {
      setLocalError(urlErr);
      return;
    }
    if (canPickBranch && selectedBranchIds.length < 1) {
      setLocalError(he.fixedTaskSelectBranchesRequired);
      return;
    }
    if (groupedCreate) {
      if (taskKind === "ad_hoc" && !dueAt) {
        return;
      }
      setLocalError("");
      await onSubmit({
        task_kind: taskKind,
        branch_id: "",
        title,
        description,
        assignee_user_id: "",
        due_at: dueAt,
        recurrence,
        due_time: dueTime,
        weekly_days: weeklyDays,
        monthly_day: monthlyDay,
        ops_category: opsCategory || null,
        apply_to_network: true,
        branch_ids: branchScope.branch_ids,
        completion_requirements: completionRequirements,
        is_work_start: isWorkStart,
        is_work_end: isWorkEnd,
        start_url: startUrl.trim() || null,
        media,
      });
      return;
    }
    if (!assigneeUserId.trim()) {
      setLocalError(he.newTaskAssigneeRequired);
      return;
    }
    if (!effectiveBranchId.trim()) {
      setLocalError(he.taskVoiceNeedBranch);
      return;
    }
    if (!toGallery && taskKind === "ad_hoc" && !dueAt) {
      return;
    }
    setLocalError("");
    await onSubmit({
      task_kind: taskKind,
      branch_id: effectiveBranchId,
      title,
      description,
      assignee_user_id: assigneeUserId,
      due_at: dueAt,
      recurrence,
      due_time: dueTime,
      weekly_days: weeklyDays,
      monthly_day: monthlyDay,
      ops_category: taskKind === "fixed" ? opsCategory || null : null,
      apply_to_network: false,
      completion_requirements: completionRequirements,
      is_work_start: taskKind === "fixed" ? isWorkStart : false,
      is_work_end: taskKind === "fixed" ? isWorkEnd : false,
      start_url: startUrl.trim() || null,
      media,
    });
  };

  const canSubmit =
    (groupedCreate
      ? selectedBranchIds.length > 0 && (taskKind === "fixed" || Boolean(dueAt))
      : Boolean(assigneeUserId.trim()) && Boolean(effectiveBranchId.trim()) &&
        (toGallery || taskKind === "fixed" || Boolean(dueAt))) &&
    !saving;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>
        {isBranchManager && branchName
          ? `${he.newTask} — ${branchName}`
          : he.newTask}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {!forcedTaskKind && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {he.taskKind}
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size="small"
              value={taskKind}
              onChange={(_, v: NewTaskKind | null) => {
                if (v) setTaskKind(v);
              }}
              disabled={saving}
            >
              <ToggleButton value="ad_hoc">{he.taskKindLabels.ad_hoc}</ToggleButton>
              <ToggleButton value="fixed">{he.taskKindLabels.fixed}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {canPickBranch && (
          <Box>
            <BranchChecklist
              branches={branches}
              selectedIds={selectedBranchIds}
              onChange={setSelectedBranchIds}
              disabled={saving}
            />
            {groupedCreate && (
              <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                {he.fixedTaskApplyToNetworkHint}
              </Typography>
            )}
          </Box>
        )}

        <TextField
          label={he.taskTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText={he.taskTitleOptionalHint}
          fullWidth
        />
        <TextField
          label={he.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          rows={2}
          fullWidth
        />
        <TextField
          label={he.startUrl}
          value={startUrl}
          onChange={(e) => setStartUrl(e.target.value)}
          helperText={he.startUrlHint}
          fullWidth
          dir="ltr"
        />

        {!groupedCreate && (
        <TextField
          select
          label={he.assignee}
          value={assigneeUserId}
          onChange={(e) => setAssigneeUserId(e.target.value)}
          required
          fullWidth
          disabled={lockAssignee || saving}
          error={Boolean(localError && !assigneeUserId)}
          helperText={toGallery ? he.assignToGalleryHint : undefined}
        >
          {!lockAssignee && forcedTaskKind !== "fixed" && (
            <MenuItem value={ASSIGN_TO_GALLERY}>
              <Box component="span" fontWeight={700}>{he.assignToGallery}</Box>
            </MenuItem>
          )}
          {branchEmployees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
          ))}
        </TextField>
        )}

        {taskKind === "ad_hoc" && !toGallery ? (
          <TextField
            label={he.dueAt}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            dir="ltr"
          />
        ) : null}
        {taskKind === "fixed" ? (
          <>
            <TextField
              select
              label={he.recurrence}
              value={recurrence}
              onChange={(e) => {
                const next = e.target.value as TaskRecurrence;
                setWeeklyDays((current) => weekdaysOnRecurrenceChange(next, current));
                setRecurrence(next);
              }}
              fullWidth
            >
              {FIXED_RECURRENCE_OPTIONS.map((r) => (
                <MenuItem key={r} value={r}>{he.recurrenceLabels[r]}</MenuItem>
              ))}
            </TextField>
            <TextField
              label={he.dueTime}
              type="time"
              value={dueTime}
              onChange={(e) => setDueTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              dir="ltr"
            />
            {recurrence === "daily" || recurrence === "weekly" ? (
              <WeekdayMultiSelect
                value={weeklyDays}
                onChange={setWeeklyDays}
                exclusive={recurrence === "weekly"}
              />
            ) : null}
            {recurrence === "monthly" && (
              <TextField
                select
                label={he.monthlyDay}
                value={String(monthlyDay)}
                onChange={(e) => setMonthlyDay(Number(e.target.value))}
                fullWidth
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <MenuItem key={day} value={String(day)}>{day}</MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label={he.opsCategory}
              value={opsCategory}
              onChange={(e) => setOpsCategory(e.target.value as OpsCategory | "")}
              fullWidth
            >
              <MenuItem value="">{he.opsCategoryNone}</MenuItem>
              {OPS_CATEGORIES.map((key) => (
                <MenuItem key={key} value={key}>
                  {he.opsCategoryLabels[key]}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isWorkStart}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsWorkStart(checked);
                    if (checked) setIsWorkEnd(false);
                  }}
                  disabled={saving}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{he.workStartTask}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {he.workStartTaskHint}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isWorkEnd}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsWorkEnd(checked);
                    if (checked) setIsWorkStart(false);
                  }}
                  disabled={saving}
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{he.workEndTask}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {he.workEndTaskHint}
                  </Typography>
                </Box>
              }
            />
          </>
        ) : null}

        <CompletionRequirementsEditor
          value={completionRequirements}
          onChange={setCompletionRequirements}
          disabled={saving}
        />

        <TaskReferenceMediaEditor
          value={media}
          onChange={setMedia}
          onDescriptionAppend={(transcript) => {
            void handleReferenceTranscript(transcript);
          }}
          disabled={saving}
          onError={onError}
        />

        {localError && (
          <Typography variant="caption" color="error">
            {localError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss() }}>
        <Button onClick={onClose} disabled={saving}>{he.cancel}</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
        >
          {saving ? <CircularProgress size={22} /> : he.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
