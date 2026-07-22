import { type ReactNode } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import CompletionMediaPreview from "./CompletionMediaPreview";
import TaskChatPanel from "./TaskChatPanel";
import TaskStatusChip from "./TaskStatusChip";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import type { TaskCompletion, TaskStatus } from "../../services/taskService";

export interface EmployeeTaskDetailTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_at: string;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  completion?: TaskCompletion | null;
}

export interface EmployeeTaskDetailDialogProps {
  task: EmployeeTaskDetailTask | null;
  titleNode?: ReactNode;
  onClose: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onChatUpdated?: () => void;
  starting?: boolean;
}

/** Ouverture tâche côté oved : médias + chat toujours visible (comme הוראות). */
export default function EmployeeTaskDetailDialog({
  task,
  titleNode,
  onClose,
  onStart,
  onComplete,
  onChatUpdated,
  starting = false,
}: EmployeeTaskDetailDialogProps) {
  if (!task) return null;

  const canStart = task.status === "pending" || task.status === "overdue";
  const canComplete = task.status === "in_progress";

  return (
    <Dialog open={Boolean(task)} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{titleNode ?? task.title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <TaskStatusChip status={task.status} />
          <Typography variant="caption" color="text.secondary" dir="ltr">
            {he.dueAt}: {formatDueAt(task.due_at)}
          </Typography>
        </Box>
        {task.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {task.description}
          </Typography>
        ) : null}
        <TaskReferenceMediaDisplay
          reference_photo_url={task.reference_photo_url}
          reference_video_url={task.reference_video_url}
          reference_audio_url={task.reference_audio_url}
        />
        {task.completion &&
          (task.completion.photo_path ||
            task.completion.video_path ||
            task.completion.audio_path) && (
            <CompletionMediaPreview
              viewer="employee"
              photo_path={task.completion.photo_path}
              video_path={task.completion.video_path}
              audio_path={task.completion.audio_path}
              audio_transcript={task.completion.audio_transcript}
              audio_transcript_employee={task.completion.audio_transcript_employee}
            />
          )}
        {!task.reference_photo_url &&
          !task.reference_video_url &&
          !task.reference_audio_url &&
          !(
            task.completion?.photo_path ||
            task.completion?.video_path ||
            task.completion?.audio_path
          ) && (
            <Typography variant="body2" color="text.secondary">
              {he.taskNoReferenceMedia}
            </Typography>
          )}
        <TaskChatPanel
          key={task.id}
          occurrenceId={task.id}
          compact
          composeEnabled={canComposeTaskChat(task.status, true)}
          onOccurrenceUpdated={() => onChatUpdated?.()}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose}>{he.close}</Button>
        {canStart && onStart && (
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={onStart}
            disabled={starting}
          >
            {he.startTask}
          </Button>
        )}
        {canComplete && onComplete && (
          <Button variant="contained" color="success" startIcon={<TaskAltIcon />} onClick={onComplete}>
            {he.markDone}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
