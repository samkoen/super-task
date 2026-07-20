import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TaskOccurrenceCard from "../tasks/TaskOccurrenceCard";
import TaskCompletionReviewDialog from "../tasks/TaskCompletionReviewDialog";
import TaskReferenceMediaEditor, {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../tasks/TaskReferenceMediaEditor";
import { ApiError } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import type { TeamMember } from "../../services/dashboardService";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { datetimeLocalForDay, formatHebrewDayShort } from "../../utils/dateView";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { filterTasksForEmployee } from "../../utils/employeeDrawerTasks";
import { buildManagerTasksPath } from "../../utils/managerTaskFilters";
import { appendDescriptionBlock } from "../../utils/photoAnnotation";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";

const EMPTY_REFERENCE_MEDIA: TaskReferenceMediaValue = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

function revokeMediaBlobs(media: TaskReferenceMediaValue) {
  for (const url of [
    media.reference_photo_url,
    media.reference_video_url,
    media.reference_audio_url,
  ]) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}

export interface EmployeeTasksDrawerProps {
  member: TeamMember | null;
  branchId: string;
  dueOn: string;
  onClose: () => void;
  onChanged?: () => void;
}

export default function EmployeeTasksDrawer({
  member,
  branchId,
  dueOn,
  onClose,
  onChanged,
}: EmployeeTasksDrawerProps) {
  const navigate = useNavigate();
  const { showError, showSuccess } = useFeedback();
  const open = Boolean(member);
  const [tasks, setTasks] = useState<TaskOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [referenceMedia, setReferenceMedia] =
    useState<TaskReferenceMediaValue>(EMPTY_REFERENCE_MEDIA);
  const [reviewTarget, setReviewTarget] = useState<TaskOccurrence | null>(null);

  const loadTasks = useCallback(async () => {
    if (!member || !branchId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await taskService.listOccurrences({
        branch_id: branchId,
        due_on: dueOn,
      });
      setTasks(filterTasksForEmployee(rows, member.user_id));
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [member, branchId, dueOn, showError]);

  useEffect(() => {
    if (!open) return;
    void loadTasks();
  }, [open, loadTasks]);

  useTaskChangeListener(
    useCallback(() => {
      if (open) void loadTasks();
    }, [open, loadTasks]),
  );

  const handleCloseCreate = () => {
    if (saving) return;
    revokeMediaBlobs(referenceMedia);
    setReferenceMedia(EMPTY_REFERENCE_MEDIA);
    setCreateOpen(false);
  };

  const handleOpenCreate = () => {
    revokeMediaBlobs(referenceMedia);
    setTitle("");
    setDescription("");
    setDueAt(datetimeLocalForDay(dueOn));
    setReferenceMedia(EMPTY_REFERENCE_MEDIA);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!member || !branchId) return;
    setSaving(true);
    try {
      const resolvedTitle = await ensureTaskTitle(title, description);
      const media = await resolveTaskReferenceMedia(referenceMedia);
      const res = await taskService.createAdHoc({
        branch_id: branchId,
        title: resolvedTitle,
        description,
        due_at: new Date(dueAt).toISOString(),
        assignee_user_id: member.user_id,
        photo_required: true,
        ...media,
      });
      revokeMediaBlobs(referenceMedia);
      setReferenceMedia(EMPTY_REFERENCE_MEDIA);
      setCreateOpen(false);
      showSuccess(res.message);
      await loadTasks();
      onChanged?.();
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
      const res = await taskService.cancel(task.id);
      showSuccess(res.message);
      await loadTasks();
      onChanged?.();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const openFullTasks = () => {
    if (!member) return;
    navigate(
      buildManagerTasksPath({
        employeeId: member.user_id,
        dueOn,
      }),
    );
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 440 },
            maxWidth: "100%",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }} dir="rtl">
          <Box
            sx={{
              px: 2,
              py: 1.5,
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              borderBottom: 1,
              borderColor: "divider",
            }}
          >
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" fontWeight={800} noWrap>
                {member?.full_name ?? ""}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {he.dashboardEmployeeDrawerSubtitle(formatHebrewDayShort(dueOn))}
              </Typography>
              {member && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {he.dashboardTasksProgress(member.completed_today, member.total_today)}
                  {" · "}
                  {member.open_tasks} {he.dashboardEmployeeDrawerOpenTasks}
                </Typography>
              )}
            </Box>
            <IconButton aria-label={he.close} onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenCreate}>
              {he.dashboardCreateTask}
            </Button>
            <Button variant="outlined" size="small" startIcon={<OpenInNewIcon />} onClick={openFullTasks}>
              {he.dashboardEmployeeDrawerAllTasks}
            </Button>
          </Box>

          <Divider />

          <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : tasks.length === 0 ? (
              <Alert severity="info">{he.dashboardEmployeeDrawerEmpty}</Alert>
            ) : (
              <Box display="flex" flexDirection="column" gap={2}>
                {tasks.map((task, index) => (
                  <TaskOccurrenceCard
                    key={task.id}
                    task={task}
                    index={index}
                    onCancel={handleCancel}
                    onReview={setReviewTarget}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      <Dialog open={createOpen} onClose={handleCloseCreate} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.newAdHocTask}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={he.assignee}
            value={member?.full_name ?? ""}
            fullWidth
            disabled
          />
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
            label={he.dueAt}
            type="datetime-local"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            InputLabelProps={{ shrink: true }}
            required
            fullWidth
            dir="ltr"
          />
          <TaskReferenceMediaEditor
            value={referenceMedia}
            onChange={setReferenceMedia}
            onDescriptionAppend={(transcript) =>
              setDescription((prev) => appendDescriptionBlock(prev, transcript))
            }
            disabled={saving}
            onError={showError}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseCreate} disabled={saving}>
            {he.cancel}
          </Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={saving || !dueAt}>
            {saving ? <CircularProgress size={22} /> : he.submit}
          </Button>
        </DialogActions>
      </Dialog>

      <TaskCompletionReviewDialog
        task={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onDone={(message) => {
          showSuccess(message);
          setReviewTarget(null);
          void loadTasks();
          onChanged?.();
        }}
      />
    </>
  );
}
