import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Box,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError, type User } from "../../services/api";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { userService } from "../../services/userService";
import { useFeedback } from "../../context/FeedbackContext";
import { useAuth } from "../../context/AuthContext";
import { ASSIGN_TO_GALLERY, isAssignToGallery } from "../../constants/taskAssignment";
import { he } from "../../i18n/he";
import { assigneeOptionLabel, assigneesForBranch, withSelfAssignee } from "../../utils/assigneeOptions";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import { startUrlFieldError } from "../../utils/startUrl";
import { defaultApplyAdHocEditToNetwork, isNetworkAdHocOccurrence } from "../../utils/adHocNetworkTasks";
import { OpenTaskChatButton } from "./TaskChatDialog";
import TaskReferenceMediaEditor from "./TaskReferenceMediaEditor";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
import CompletionMediaPreview from "./CompletionMediaPreview";
import EditDialogSaveActions from "../ui/EditDialogSaveActions";
import FormDialog from "../ui/FormDialog";
import QuickTimePresets from "../ui/QuickTimePresets";
import TaskAdvancedFields from "./form/TaskAdvancedFields";
import TaskFormSection from "./form/TaskFormSection";
import { EMPLOYEE_BRAND, employeeFieldSx } from "../../styles/employeeUi";
import { followUpPresets, formatFollowUpPreview } from "../../utils/chatTaskFollowUp";
import {
  emptyOccurrenceEditForm,
  formFromOccurrence,
  saveOccurrenceEdit,
  type OccurrenceEditForm,
} from "./taskOccurrenceEditForm";

export interface TaskOccurrenceEditDialogProps {
  occurrenceId: string | null;
  onClose: () => void;
  onSaved?: (message: string) => void;
  /** Si fourni, évite un fetch team (page tâches). */
  employees?: User[];
}

export default function TaskOccurrenceEditDialog({
  occurrenceId,
  onClose,
  onSaved,
  employees: employeesProp,
}: TaskOccurrenceEditDialogProps) {
  const { user } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const isBranchManager = user?.role === "branch_manager";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<TaskOccurrence | null>(null);
  const [form, setForm] = useState<OccurrenceEditForm>(emptyOccurrenceEditForm);
  const [mediaDirty, setMediaDirty] = useState(false);
  const [employees, setEmployees] = useState<User[]>(employeesProp ?? []);

  useEffect(() => {
    if (employeesProp) setEmployees(employeesProp);
  }, [employeesProp]);

  useEffect(() => {
    if (!occurrenceId) {
      setTarget(null);
      setForm(emptyOccurrenceEditForm());
      setMediaDirty(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadEditTarget(occurrenceId, Boolean(employeesProp), (result) => {
      if (cancelled) return;
      if (result.ok === false) {
        showError(result.error);
        onClose();
        setLoading(false);
        return;
      }
      setTarget(result.fresh);
      setForm({
        ...formFromOccurrence(result.fresh),
        apply_to_network: defaultApplyAdHocEditToNetwork(
          result.fresh,
          user?.role === "network_manager" || user?.role === "admin",
        ),
      });
      setMediaDirty(false);
      if (result.employees) setEmployees(result.employees);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [occurrenceId, employeesProp, onClose, showError, user?.role]);

  const editEmployees = useMemo(() => {
    const staff = withSelfAssignee(employees, user);
    if (!target) return staff;
    return assigneesForBranch(staff, target.branch_id, user?.id);
  }, [employees, target, user]);

  const handleSave = async () => {
    if (!target) return;
    const urlErr = startUrlFieldError(form.start_url);
    if (urlErr) {
      showError(urlErr);
      return;
    }
    setSaving(true);
    try {
      const message = await saveOccurrenceEdit(target, form, mediaDirty);
      showSuccess(message);
      onSaved?.(message);
      onClose();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={Boolean(occurrenceId)}
      title={he.editTask}
      onClose={onClose}
      busy={saving || loading}
      actions={
        <EditDialogSaveActions
          applyToNetwork={form.apply_to_network}
          resetKey={occurrenceId ?? undefined}
          onCancel={onClose}
          onSave={() => void handleSave()}
          disabled={saving || loading}
          submitDisabled={!form.title.trim() || !form.due_at}
          submitting={saving}
        />
      }
    >
        {loading || !target ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <OpenTaskChatButton
              occurrenceId={target.id}
              title={target.title}
              status={target.status}
              employee={false}
              chatFollowUpAt={target.chat_follow_up_at}
              chatResolvedAt={target.chat_resolved_at}
              completion={target.completion ?? null}
              onOccurrenceUpdated={(_status, notice) => {
                showSuccess(notice ?? he.taskChatSent);
                if (notice !== he.taskChatSent) {
                  onSaved?.(notice ?? he.taskChatSent);
                }
              }}
            />
            <SubmittedCompletionMedia task={target} />
            <TaskFormSection title={he.taskFormSectionWhat}>
              <TextField
                label={he.taskTitle}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                fullWidth
                sx={employeeFieldSx}
              />
              <TextField
                label={he.description}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                multiline
                minRows={2}
                fullWidth
                sx={employeeFieldSx}
              />
              <TaskReferenceMediaEditor
                key={target.id}
                value={{
                  reference_photo_url: form.reference_photo_url,
                  reference_video_url: form.reference_video_url,
                  reference_audio_url: form.reference_audio_url,
                  pending_photo: form.pending_photo,
                  pending_video: form.pending_video,
                }}
                onChange={(media) => {
                  setMediaDirty(true);
                  setForm({
                    ...form,
                    reference_photo_url: media.reference_photo_url,
                    reference_video_url: media.reference_video_url,
                    reference_audio_url: media.reference_audio_url,
                    pending_photo: media.pending_photo ?? null,
                    pending_video: media.pending_video ?? null,
                  });
                }}
                onDescriptionAppend={(transcript) =>
                  setForm((f) => ({
                    ...f,
                    description: appendDescriptionBlock(f.description, transcript),
                  }))
                }
                disabled={saving}
                onError={showError}
              />
            </TaskFormSection>
            <TaskFormSection title={he.taskFormSectionWho}>
              <AssigneeField
                target={target}
                form={form}
                setForm={setForm}
                editEmployees={editEmployees}
                isBranchManager={isBranchManager}
                currentUserId={user?.id}
              />
              <DueAtField form={form} setForm={setForm} disabled={saving} />
              <NetworkScopeSwitch
                visible={
                  (user?.role === "network_manager" || user?.role === "admin") &&
                  isNetworkAdHocOccurrence(target)
                }
                form={form}
                setForm={setForm}
              />
            </TaskFormSection>
            <TaskFormSection title={he.taskFormSectionProof}>
              <CompletionRequirementsEditor
                value={form.completion_requirements}
                onChange={(completion_requirements) =>
                  setForm({ ...form, completion_requirements })
                }
                disabled={saving}
              />
            </TaskFormSection>
            <TaskAdvancedFields
              taskKind="ad_hoc"
              value={{ startUrl: form.start_url ?? "", opsCategory: "", isWorkStart: false, isWorkEnd: false }}
              onChange={(patch) => {
                if (patch.startUrl !== undefined) setForm({ ...form, start_url: patch.startUrl });
              }}
              disabled={saving}
            />
          </>
        )}
    </FormDialog>
  );
}

function DueAtField({
  form,
  setForm,
  disabled,
}: {
  form: OccurrenceEditForm;
  setForm: Dispatch<SetStateAction<OccurrenceEditForm>>;
  disabled: boolean;
}) {
  const presets = useMemo(() => followUpPresets(new Date()), []);
  const preview = formatFollowUpPreview(form.due_at);
  return (
    <>
      <QuickTimePresets
        presets={presets}
        selected={form.due_at}
        onPick={(due_at) => setForm({ ...form, due_at })}
        disabled={disabled}
        row
      />
      <TextField
        label={he.dueAt}
        type="datetime-local"
        value={form.due_at}
        onChange={(e) => setForm({ ...form, due_at: e.target.value })}
        InputLabelProps={{ shrink: true }}
        required
        fullWidth
        dir="ltr"
        sx={employeeFieldSx}
      />
      {preview ? (
        <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }}>
          {he.taskDueSummary(preview)}
        </Typography>
      ) : null}
    </>
  );
}

function NetworkScopeSwitch({
  visible,
  form,
  setForm,
}: {
  visible: boolean;
  form: OccurrenceEditForm;
  setForm: Dispatch<SetStateAction<OccurrenceEditForm>>;
}) {
  if (!visible) return null;
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={form.apply_to_network}
            onChange={(e) => setForm({ ...form, apply_to_network: e.target.checked })}
          />
        }
        label={he.fixedTaskUpdateAllBranches}
      />
      {form.apply_to_network && (
        <Typography color="text.secondary">{he.fixedTaskUpdateAllBranchesHint}</Typography>
      )}
    </>
  );
}

type LoadResult =
  | { ok: true; fresh: TaskOccurrence; employees?: User[] }
  | { ok: false; error: string };

async function loadEditTarget(
  occurrenceId: string,
  skipEmployees: boolean,
  done: (result: LoadResult) => void,
): Promise<void> {
  try {
    const fresh = await taskService.getOccurrence(occurrenceId);
    if (skipEmployees) {
      done({ ok: true, fresh });
      return;
    }
    const team = await userService.listTeam("employee");
    done({
      ok: true,
      fresh,
      employees: assigneesForBranch(team, fresh.branch_id),
    });
  } catch (e) {
    done({ ok: false, error: e instanceof ApiError ? e.message : he.errorGeneric });
  }
}

function SubmittedCompletionMedia({ task }: { task: TaskOccurrence }) {
  const completion = task.completion;
  if (!completion) return null;
  return (
    <CompletionMediaPreview
      photo_path={completion.photo_path}
      video_path={completion.video_path}
      audio_path={completion.audio_path}
      attachments={completion.completion_attachments}
      requirements={task.completion_requirements}
      audio_transcript={completion.audio_transcript}
    />
  );
}

function AssigneeField({
  target,
  form,
  setForm,
  editEmployees,
  isBranchManager,
  currentUserId,
}: {
  target: TaskOccurrence;
  form: OccurrenceEditForm;
  setForm: Dispatch<SetStateAction<OccurrenceEditForm>>;
  editEmployees: User[];
  isBranchManager: boolean;
  currentUserId?: string;
}) {
  if (!(isBranchManager || Boolean(form.assignee_user_id) || Boolean(currentUserId))) return null;
  return (
    <TextField
      select
      label={he.assignee}
      value={form.assignee_user_id}
      onChange={(e) => setForm({ ...form, assignee_user_id: e.target.value })}
      required={target.task_kind === "ad_hoc"}
      fullWidth
      helperText={isAssignToGallery(form.assignee_user_id) ? he.assignToGalleryHint : undefined}
      sx={employeeFieldSx}
    >
      {target.can_add_to_gallery !== false && (
        <MenuItem value={ASSIGN_TO_GALLERY}>
          <Box component="span" fontWeight={700}>
            {he.assignToGallery}
          </Box>
        </MenuItem>
      )}
      <MenuItem value="">{he.noAssignee}</MenuItem>
      {editEmployees.map((u) => (
        <MenuItem key={u.id} value={u.id}>
          {assigneeOptionLabel(u, currentUserId)}
        </MenuItem>
      ))}
    </TextField>
  );
}
