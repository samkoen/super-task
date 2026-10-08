import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import type { User } from "../../services/api";
import type { Branch } from "../../services/branchService";
import { asList } from "../../utils/asList";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
import BranchChecklist from "./BranchChecklist";
import TaskReferenceMediaEditor, {
  type TaskReferenceMediaValue,
} from "./TaskReferenceMediaEditor";
import FormDialog from "../ui/FormDialog";
import DeliveryNoteTemplateFields from "./form/DeliveryNoteTemplateFields";
import TaskAdvancedFields, { type TaskAdvancedValue } from "./form/TaskAdvancedFields";
import { DELIVERY_TASK_LINE_CHECK } from "../../utils/deliveryNote";
import TaskFormSection from "./form/TaskFormSection";
import TaskKindPicker from "./form/TaskKindPicker";
import TaskScheduleFields, { type TaskScheduleValue } from "./form/TaskScheduleFields";
import { dialogSecondaryActionSx } from "../../styles/dialogUi";
import { employeeFieldSx, employeePrimaryButtonSx } from "../../styles/employeeUi";
import { taskFormMissing, taskFormMissingMessage } from "../../utils/taskFormReadiness";
import { applyReferenceTranscript } from "../../utils/applyReferenceTranscript";
import { ASSIGN_TO_GALLERY, isAssignToGallery } from "../../constants/taskAssignment";
import { type OpsCategory, type TaskRecurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { assigneeOptionLabel, assigneesForBranch } from "../../utils/assigneeOptions";
import type { CompletionRequirement } from "../../utils/completionMedia";
import {
  createFieldsFromBranchSelection,
} from "../../utils/fixedTaskCreateScope";
import { DAILY_DEFAULT_WEEKDAYS } from "../../utils/taskRecurrence";
import { startUrlFieldError } from "../../utils/startUrl";
import {
  readFixedTaskCreateForm,
  writeFixedTaskCreateForm,
  type FixedTaskCreateFormDraft,
} from "../../utils/fixedTaskScreenDraft";

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
  opened_by_delivery_note?: boolean;
  delivery_note_task_type?: string | null;
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
  currentUserId?: string;
  /** Garde le brouillon si on quitte /manager/fixed-tasks. */
  rememberKey?: string;
}

export default function NewTaskFormDialog({
  open,
  onClose,
  onSubmit,
  branches: branchesProp,
  employees: employeesProp,
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
  currentUserId,
  rememberKey,
}: NewTaskFormDialogProps) {
  const branches = asList<Branch>(branchesProp);
  const employees = asList<User>(employeesProp);
  const remembered = useRef(
    rememberKey ? readFixedTaskCreateForm(rememberKey) : null,
  ).current;
  const [taskKind, setTaskKind] = useState<NewTaskKind>(
    remembered?.taskKind ?? forcedTaskKind ?? "ad_hoc",
  );
  const [branchId, setBranchId] = useState(remembered?.branchId ?? "");
  const [title, setTitle] = useState(remembered?.title ?? "");
  const [description, setDescription] = useState(remembered?.description ?? "");
  const [assigneeUserId, setAssigneeUserId] = useState(remembered?.assigneeUserId ?? "");
  const [dueAt, setDueAt] = useState(remembered?.dueAt ?? "");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(remembered?.recurrence ?? "daily");
  const [dueTime, setDueTime] = useState(remembered?.dueTime ?? "09:00");
  const [weeklyDays, setWeeklyDays] = useState(remembered?.weeklyDays ?? DAILY_DEFAULT_WEEKDAYS);
  const [monthlyDay, setMonthlyDay] = useState(remembered?.monthlyDay ?? 1);
  const [opsCategory, setOpsCategory] = useState<OpsCategory | "">(remembered?.opsCategory ?? "");
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>(
    remembered?.selectedBranchIds ?? [],
  );
  const [completionRequirements, setCompletionRequirements] = useState<CompletionRequirement[]>(
    remembered?.completionRequirements ?? [],
  );
  const [isWorkStart, setIsWorkStart] = useState(remembered?.isWorkStart ?? false);
  const [isWorkEnd, setIsWorkEnd] = useState(remembered?.isWorkEnd ?? false);
  const [startUrl, setStartUrl] = useState(remembered?.startUrl ?? "");
  const [openedByDeliveryNote, setOpenedByDeliveryNote] = useState(
    remembered?.openedByDeliveryNote ?? false,
  );
  const [deliveryNoteTaskType, setDeliveryNoteTaskType] = useState(
    remembered?.deliveryNoteTaskType ?? DELIVERY_TASK_LINE_CHECK,
  );
  const [media, setMedia] = useState<TaskReferenceMediaValue>(remembered?.media ?? EMPTY_MEDIA);
  const [localError, setLocalError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const wasOpenRef = useRef(false);

  // Reset UNIQUEMENT à l'ouverture (pas à chaque re-render parent / dueAt / employees).
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened || remembered) return;
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
    setOpenedByDeliveryNote(false);
    setDeliveryNoteTaskType(DELIVERY_TASK_LINE_CHECK);
    setMedia(initialMedia ?? EMPTY_MEDIA);
    setLocalError("");
    // Snapshot à l'ouverture seulement
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!rememberKey || !open) return;
    const draft: FixedTaskCreateFormDraft = {
      taskKind,
      branchId,
      title,
      description,
      assigneeUserId,
      dueAt,
      recurrence,
      dueTime,
      weeklyDays,
      monthlyDay,
      opsCategory,
      selectedBranchIds,
      completionRequirements,
      isWorkStart,
      isWorkEnd,
      startUrl,
      media,
      openedByDeliveryNote,
      deliveryNoteTaskType,
    };
    writeFixedTaskCreateForm(rememberKey, draft);
  }, [
    rememberKey,
    open,
    taskKind,
    branchId,
    title,
    description,
    assigneeUserId,
    dueAt,
    recurrence,
    dueTime,
    weeklyDays,
    monthlyDay,
    opsCategory,
    selectedBranchIds,
    completionRequirements,
    isWorkStart,
    isWorkEnd,
    startUrl,
    media,
    openedByDeliveryNote,
    deliveryNoteTaskType,
  ]);

  const allBranchIds = useMemo(() => branches.map((b) => b.id), [branches]);
  const branchScope = canPickBranch
    ? createFieldsFromBranchSelection(selectedBranchIds, allBranchIds)
    : { grouped: false, apply_to_network: false, branch_id: branchId };
  const groupedCreate = branchScope.grouped;
  const effectiveBranchId = branchScope.branch_id || branchId;

  const branchEmployees = useMemo(() => {
    const base = effectiveBranchId
      ? assigneesForBranch(employees, effectiveBranchId, currentUserId)
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
  }, [employees, effectiveBranchId, assigneeUserId, currentUserId]);

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
    const openedByNote = taskKind === "fixed" && openedByDeliveryNote;
    const deliveryNote = {
      opened_by_delivery_note: openedByNote,
      delivery_note_task_type: openedByNote ? deliveryNoteTaskType : null,
    };
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
        ...deliveryNote,
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
      ...deliveryNote,
      media,
    });
  };


  const missing = taskFormMissing({
    taskKind,
    grouped: groupedCreate,
    canPickBranch,
    selectedBranchCount: selectedBranchIds.length,
    assigneeUserId,
    effectiveBranchId,
    toGallery,
    dueAt,
  });
  const canSubmit = missing.length === 0 && !saving;
  const missingMessage = taskFormMissingMessage(missing);
  const urlProblem = Boolean(localError) && Boolean(startUrlFieldError(startUrl));
  const dialogTitle =
    isBranchManager && branchName ? `${he.newTask} — ${branchName}` : he.newTask;

  const patchSchedule = (patch: Partial<TaskScheduleValue>) => {
    if (patch.dueAt !== undefined) setDueAt(patch.dueAt);
    if (patch.recurrence !== undefined) setRecurrence(patch.recurrence);
    if (patch.dueTime !== undefined) setDueTime(patch.dueTime);
    if (patch.weeklyDays !== undefined) setWeeklyDays(patch.weeklyDays);
    if (patch.monthlyDay !== undefined) setMonthlyDay(patch.monthlyDay);
  };
  const patchAdvanced = (patch: Partial<TaskAdvancedValue>) => {
    if (patch.startUrl !== undefined) setStartUrl(patch.startUrl);
    if (patch.opsCategory !== undefined) setOpsCategory(patch.opsCategory);
    if (patch.isWorkStart !== undefined) setIsWorkStart(patch.isWorkStart);
    if (patch.isWorkEnd !== undefined) setIsWorkEnd(patch.isWorkEnd);
  };

  return (
    <FormDialog
      open={open}
      title={dialogTitle}
      onClose={onClose}
      busy={saving}
      actions={
        <>
          <Button onClick={onClose} disabled={saving} sx={dialogSecondaryActionSx}>
            {he.cancel}
          </Button>
          <Button
            variant="contained"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            sx={employeePrimaryButtonSx}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : he.newTaskCreate}
          </Button>
          {localError ? (
            <Typography color="error" fontWeight={700} sx={{ textAlign: "center" }}>
              {localError}
            </Typography>
          ) : null}
          {missingMessage ? (
            <Typography color="text.secondary" sx={{ textAlign: "center", fontSize: "1rem" }}>
              {missingMessage}
            </Typography>
          ) : null}
        </>
      }
    >
      {!forcedTaskKind && (
        <TaskFormSection title={he.taskKind}>
          <TaskKindPicker value={taskKind} onChange={setTaskKind} disabled={saving} />
        </TaskFormSection>
      )}

      <TaskFormSection title={he.taskFormSectionWhat}>
        <TextField
          label={he.taskTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          helperText={he.taskTitleOptionalHint}
          fullWidth
          sx={employeeFieldSx}
        />
        <TextField
          label={he.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          sx={employeeFieldSx}
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
      </TaskFormSection>

      <TaskFormSection title={he.taskFormSectionWho}>
        {canPickBranch && (
          <Box>
            <BranchChecklist
              branches={branches}
              selectedIds={selectedBranchIds}
              onChange={setSelectedBranchIds}
              disabled={saving}
            />
            {groupedCreate && (
              <Typography color="text.secondary" display="block" mt={0.75}>
                {he.fixedTaskApplyToNetworkHint}
              </Typography>
            )}
          </Box>
        )}
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
            sx={employeeFieldSx}
          >
            {!lockAssignee && forcedTaskKind !== "fixed" && (
              <MenuItem value={ASSIGN_TO_GALLERY}>
                <Box component="span" fontWeight={700}>{he.assignToGallery}</Box>
              </MenuItem>
            )}
            {branchEmployees.map((u) => (
              <MenuItem key={u.id} value={u.id}>{assigneeOptionLabel(u, currentUserId)}</MenuItem>
            ))}
          </TextField>
        )}
        <TaskScheduleFields
          taskKind={taskKind}
          toGallery={toGallery}
          value={{ dueAt, recurrence, dueTime, weeklyDays, monthlyDay }}
          onChange={patchSchedule}
          disabled={saving}
        />
      </TaskFormSection>

      {taskKind === "fixed" ? (
        <TaskFormSection title={he.deliveryNoteSectionTitle}>
          <DeliveryNoteTemplateFields
            enabled={openedByDeliveryNote}
            onEnabledChange={setOpenedByDeliveryNote}
            taskType={deliveryNoteTaskType}
            onTaskTypeChange={setDeliveryNoteTaskType}
            disabled={saving}
          />
        </TaskFormSection>
      ) : null}

      <TaskFormSection title={he.taskFormSectionProof}>
        <CompletionRequirementsEditor
          value={completionRequirements}
          onChange={setCompletionRequirements}
          disabled={saving}
        />
      </TaskFormSection>

      <TaskAdvancedFields
        taskKind={taskKind}
        value={{ startUrl, opsCategory, isWorkStart, isWorkEnd }}
        onChange={patchAdvanced}
        open={advancedOpen || urlProblem}
        onOpenChange={setAdvancedOpen}
        disabled={saving}
      />
    </FormDialog>
  );
}
