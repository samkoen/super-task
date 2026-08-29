import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { userBelongsToBranch } from "../../utils/userBranchMembership";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import { startUrlFieldError } from "../../utils/startUrl";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { defaultApplyAdHocEditToNetwork, isNetworkAdHocOccurrence } from "../../utils/adHocNetworkTasks";
import TaskChatPanel from "./TaskChatPanel";
import TaskReferenceMediaEditor from "./TaskReferenceMediaEditor";
import CompletionRequirementsEditor from "./CompletionRequirementsEditor";
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
  }, [occurrenceId, employeesProp, onClose, showError]);

  const editEmployees = useMemo(() => {
    if (!target) return employees;
    return employees.filter((u) => userBelongsToBranch(u, target.branch_id));
  }, [employees, target]);

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
    <Dialog
      open={Boolean(occurrenceId)}
      onClose={() => {
        if (saving || loading) return;
        onClose();
      }}
      fullWidth
      maxWidth="sm"
      dir="rtl"
    >
      <DialogTitle>{he.editTask}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {loading || !target ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TaskChatPanel
              key={`chat-${target.id}`}
              occurrenceId={target.id}
              occurrenceStatus={target.status}
              chatFollowUpAt={target.chat_follow_up_at}
              chatResolvedAt={target.chat_resolved_at}
              compact
              composeEnabled={canComposeTaskChat(target.status, false)}
              onOccurrenceUpdated={(_status, notice) => {
                showSuccess(notice ?? he.taskChatSent);
                onSaved?.(notice ?? he.taskChatSent);
              }}
            />
            <CoreEditFields form={form} setForm={setForm} />
            <AssigneeField
              target={target}
              form={form}
              setForm={setForm}
              editEmployees={editEmployees}
              isBranchManager={isBranchManager}
            />
            <CompletionRequirementsEditor
              value={form.completion_requirements}
              onChange={(completion_requirements) =>
                setForm({ ...form, completion_requirements })
              }
              disabled={saving}
            />
            {(user?.role === "network_manager" || user?.role === "admin") &&
              isNetworkAdHocOccurrence(target) && (
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
                  <Typography variant="caption" color="text.secondary">
                    {he.fixedTaskUpdateAllBranchesHint}
                  </Typography>
                )}
              </>
            )}
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
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onClose} disabled={saving || loading}>
          {he.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || loading || !form.title.trim() || !form.due_at}
        >
          {saving ? <CircularProgress size={22} /> : he.submit}
        </Button>
      </DialogActions>
    </Dialog>
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
      employees: team.filter((u) => userBelongsToBranch(u, fresh.branch_id)),
    });
  } catch (e) {
    done({ ok: false, error: e instanceof ApiError ? e.message : he.errorGeneric });
  }
}

function CoreEditFields({
  form,
  setForm,
}: {
  form: OccurrenceEditForm;
  setForm: Dispatch<SetStateAction<OccurrenceEditForm>>;
}) {
  return (
    <>
      <TextField
        label={he.taskTitle}
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
        fullWidth
      />
      <TextField
        label={he.description}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        multiline
        rows={2}
        fullWidth
      />
      <TextField
        label={he.startUrl}
        value={form.start_url ?? ""}
        onChange={(e) => setForm({ ...form, start_url: e.target.value })}
        helperText={he.startUrlHint}
        fullWidth
        dir="ltr"
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
      />
    </>
  );
}

function AssigneeField({
  target,
  form,
  setForm,
  editEmployees,
  isBranchManager,
}: {
  target: TaskOccurrence;
  form: OccurrenceEditForm;
  setForm: Dispatch<SetStateAction<OccurrenceEditForm>>;
  editEmployees: User[];
  isBranchManager: boolean;
}) {
  if (!(isBranchManager || Boolean(form.assignee_user_id))) return null;
  return (
    <TextField
      select
      label={he.assignee}
      value={form.assignee_user_id}
      onChange={(e) => setForm({ ...form, assignee_user_id: e.target.value })}
      required={target.task_kind === "ad_hoc"}
      fullWidth
      helperText={isAssignToGallery(form.assignee_user_id) ? he.assignToGalleryHint : undefined}
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
          {u.full_name}
        </MenuItem>
      ))}
    </TextField>
  );
}
