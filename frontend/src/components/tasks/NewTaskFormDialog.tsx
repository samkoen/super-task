import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { User } from "../../services/api";
import type { Branch } from "../../services/branchService";
import TaskReferenceMediaEditor, {
  type TaskReferenceMediaValue,
} from "./TaskReferenceMediaEditor";
import { applyReferenceTranscript } from "../../utils/applyReferenceTranscript";
import type { TaskRecurrence } from "../../services/taskService";
import { he } from "../../i18n/he";

const RECURRENCES: TaskRecurrence[] = ["daily", "weekly", "biweekly", "monthly"];
const WEEKDAYS = [
  { value: "0", label: he.weekdayMon },
  { value: "1", label: he.weekdayTue },
  { value: "2", label: he.weekdayWed },
  { value: "3", label: he.weekdayThu },
  { value: "4", label: he.weekdayFri },
  { value: "5", label: he.weekdaySat },
  { value: "6", label: he.weekdaySun },
];

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
  initialMedia,
  initialPrefill,
  saving = false,
  onError,
}: NewTaskFormDialogProps) {
  const [taskKind, setTaskKind] = useState<NewTaskKind>("ad_hoc");
  const [branchId, setBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>("daily");
  const [dueTime, setDueTime] = useState("09:00");
  const [weeklyDays, setWeeklyDays] = useState("0");
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [media, setMedia] = useState<TaskReferenceMediaValue>(EMPTY_MEDIA);
  const [localError, setLocalError] = useState("");
  const wasOpenRef = useRef(false);

  // Reset UNIQUEMENT à l'ouverture (pas à chaque re-render parent / dueAt / employees).
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setTaskKind("ad_hoc");
    setBranchId(defaultBranchId);
    setTitle(initialPrefill?.title ?? "");
    setDescription(initialPrefill?.description ?? "");
    setAssigneeUserId(
      initialPrefill?.assignee_user_id || defaultAssigneeId || "",
    );
    setDueAt(defaultDueAt);
    setRecurrence("daily");
    setDueTime("09:00");
    setWeeklyDays("0");
    setMonthlyDay(1);
    setMedia(initialMedia ?? EMPTY_MEDIA);
    setLocalError("");
    // Snapshot à l'ouverture seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const branchEmployees = useMemo(() => {
    const base = branchId ? employees.filter((u) => u.branch_id === branchId) : employees;
    if (assigneeUserId && !base.some((u) => u.id === assigneeUserId)) {
      const hit = employees.find((u) => u.id === assigneeUserId);
      if (hit) return [hit, ...base];
    }
    return base;
  }, [employees, branchId, assigneeUserId]);

  const branchName =
    branches.find((b) => b.id === branchId)?.name || "";

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

  const handleSubmit = async () => {
    if (!assigneeUserId.trim()) {
      setLocalError(he.newTaskAssigneeRequired);
      return;
    }
    if (!branchId.trim()) {
      setLocalError(he.taskVoiceNeedBranch);
      return;
    }
    setLocalError("");
    await onSubmit({
      task_kind: taskKind,
      branch_id: branchId,
      title,
      description,
      assignee_user_id: assigneeUserId,
      due_at: dueAt,
      recurrence,
      due_time: dueTime,
      weekly_days: weeklyDays,
      monthly_day: monthlyDay,
      media,
    });
  };

  const canSubmit =
    Boolean(assigneeUserId.trim()) &&
    Boolean(branchId.trim()) &&
    (taskKind === "fixed" || Boolean(dueAt)) &&
    !saving;

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>
        {isBranchManager && branchName
          ? `${he.newTask} — ${branchName}`
          : he.newTask}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
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

        {canPickBranch && (
          <TextField
            select
            label={he.branch}
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
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

        {taskKind === "ad_hoc" ? (
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
        ) : (
          <>
            <TextField
              select
              label={he.recurrence}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as TaskRecurrence)}
              fullWidth
            >
              {RECURRENCES.map((r) => (
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
            {(recurrence === "weekly" || recurrence === "biweekly") && (
              <TextField
                select
                label={he.weekday}
                value={weeklyDays}
                onChange={(e) => setWeeklyDays(e.target.value)}
                fullWidth
              >
                {WEEKDAYS.map((d) => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </TextField>
            )}
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
          </>
        )}

        <TextField
          select
          label={he.assignee}
          value={assigneeUserId}
          onChange={(e) => setAssigneeUserId(e.target.value)}
          required
          fullWidth
          disabled={lockAssignee || saving}
          error={Boolean(localError && !assigneeUserId)}
        >
          {branchEmployees.map((u) => (
            <MenuItem key={u.id} value={u.id}>{u.full_name}</MenuItem>
          ))}
        </TextField>

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
      <DialogActions sx={{ px: 3, pb: 2 }}>
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
