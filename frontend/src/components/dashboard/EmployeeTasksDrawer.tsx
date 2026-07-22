import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TaskOccurrenceCard from "../tasks/TaskOccurrenceCard";
import TaskCompletionReviewDialog from "../tasks/TaskCompletionReviewDialog";
import NewTaskPhotoStep from "../tasks/NewTaskPhotoStep";
import NewTaskFormDialog, { type NewTaskFormSubmitPayload } from "../tasks/NewTaskFormDialog";
import TaskGalleryPickerDialog from "../tasks/TaskGalleryPickerDialog";
import GalleryQuickAssignDialog, {
  type GalleryQuickAssignPayload,
} from "../tasks/GalleryQuickAssignDialog";
import {
  resolveTaskReferenceMedia,
  type TaskReferenceMediaValue,
} from "../tasks/TaskReferenceMediaEditor";
import { ApiError, type User } from "../../services/api";
import type { TaskGalleryItem } from "../../services/taskGalleryService";
import { useFeedback } from "../../context/FeedbackContext";
import type { TeamMember } from "../../services/dashboardService";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { datetimeLocalForNewTask, formatHebrewDayShort } from "../../utils/dateView";
import { ensureTaskTitle } from "../../utils/ensureTaskTitle";
import { filterTasksForEmployee } from "../../utils/employeeDrawerTasks";
import { buildManagerTasksPath } from "../../utils/managerTaskFilters";
import { mediaFromPhotoFile, revokeTaskMediaBlobs } from "../../utils/newTaskMedia";
import { useTaskChangeListener } from "../../hooks/useTaskChangeListener";

const EMPTY_REFERENCE_MEDIA: TaskReferenceMediaValue = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

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
  const [photoStepOpen, setPhotoStepOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMedia, setFormMedia] = useState<TaskReferenceMediaValue>(EMPTY_REFERENCE_MEDIA);
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [galleryAssignItem, setGalleryAssignItem] = useState<TaskGalleryItem | null>(null);

  const lockedEmployee = useMemo((): User[] => {
    if (!member) return [];
    return [
      {
        id: member.user_id,
        email: "",
        first_name: "",
        last_name: "",
        full_name: member.full_name,
        role: "employee",
        phone: null,
        job_function: null,
        network_id: null,
        branch_id: branchId,
        is_active: true,
        email_verified: true,
      },
    ];
  }, [member, branchId]);
  const [saving, setSaving] = useState(false);
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

  const openForm = (media?: TaskReferenceMediaValue) => {
    setFormMedia(media ?? EMPTY_REFERENCE_MEDIA);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    revokeTaskMediaBlobs(formMedia);
    setFormMedia(EMPTY_REFERENCE_MEDIA);
    setFormOpen(false);
  };

  const handleCreate = async (payload: NewTaskFormSubmitPayload) => {
    if (!member || !branchId) return;
    setSaving(true);
    try {
      const title = await ensureTaskTitle(payload.title, payload.description);
      const media = await resolveTaskReferenceMedia(payload.media);
      if (payload.task_kind === "fixed") {
        const res = await taskService.createTemplate({
          branch_id: branchId,
          title,
          description: payload.description,
          recurrence: payload.recurrence,
          due_time: payload.due_time,
          weekly_days:
            payload.recurrence === "weekly" || payload.recurrence === "biweekly"
              ? payload.weekly_days
              : undefined,
          monthly_day: payload.recurrence === "monthly" ? payload.monthly_day : undefined,
          assignee_user_id: member.user_id,
          ops_category: payload.ops_category,
          ...media,
        });
        showSuccess(res.message);
      } else {
        const res = await taskService.createAdHoc({
          branch_id: branchId,
          title,
          description: payload.description,
          due_at: new Date(payload.due_at).toISOString(),
          assignee_user_id: member.user_id,
          photo_required: true,
          ...media,
        });
        showSuccess(res.message);
      }
      revokeTaskMediaBlobs(formMedia);
      setFormMedia(EMPTY_REFERENCE_MEDIA);
      setFormOpen(false);
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

  const handleGalleryQuickAssign = async ({
    item,
    due_at,
  }: GalleryQuickAssignPayload) => {
    if (!member || !branchId) return;
    setSaving(true);
    try {
      const media = {
        reference_photo_url: item.reference_photo_url || undefined,
        reference_video_url: item.reference_video_url || undefined,
        reference_audio_url: item.reference_audio_url || undefined,
      };
      if (item.task_kind === "fixed") {
        const res = await taskService.createTemplate({
          branch_id: branchId,
          title: item.title,
          description: item.description,
          recurrence: (item.recurrence as "daily" | "weekly" | "biweekly" | "monthly") || "daily",
          due_time: item.due_time || "09:00",
          weekly_days: item.weekly_days || undefined,
          monthly_day: item.monthly_day ?? undefined,
          assignee_user_id: member.user_id,
          source_gallery_item_id: item.id,
          ...media,
        });
        showSuccess(res.message);
      } else {
        const res = await taskService.createAdHoc({
          branch_id: branchId,
          title: item.title,
          description: item.description,
          due_at: new Date(due_at).toISOString(),
          assignee_user_id: member.user_id,
          photo_required: true,
          source_gallery_item_id: item.id,
          ...media,
        });
        showSuccess(res.message);
      }
      setGalleryAssignItem(null);
      await loadTasks();
      onChanged?.();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
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
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setPhotoStepOpen(true)}
            >
              {he.newTask}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<CollectionsBookmarkIcon />}
              onClick={() => setGalleryPickerOpen(true)}
            >
              {he.newTaskFromGallery}
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
                    onChatUpdated={() => void loadTasks()}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </Drawer>

      <NewTaskPhotoStep
        open={photoStepOpen}
        onClose={() => setPhotoStepOpen(false)}
        onSkip={() => {
          setPhotoStepOpen(false);
          openForm();
        }}
        onPhoto={(file) => {
          setPhotoStepOpen(false);
          openForm(mediaFromPhotoFile(file));
        }}
      />

      <NewTaskFormDialog
        open={formOpen}
        onClose={closeForm}
        onSubmit={handleCreate}
        branches={[]}
        employees={lockedEmployee}
        isBranchManager
        canPickBranch={false}
        defaultBranchId={branchId}
        defaultDueAt={datetimeLocalForNewTask(dueOn)}
        defaultAssigneeId={member?.user_id ?? ""}
        lockAssignee
        initialMedia={formMedia}
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
        branches={[]}
        employees={lockedEmployee}
        canPickBranch={false}
        defaultBranchId={branchId}
        defaultDueAt={datetimeLocalForNewTask(dueOn)}
        defaultAssigneeId={member?.user_id ?? ""}
        saving={saving}
        onClose={() => setGalleryAssignItem(null)}
        onSubmit={handleGalleryQuickAssign}
      />

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
