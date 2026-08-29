import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import CompletionMediaPreview from "./CompletionMediaPreview";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import TaskChatPanel from "./TaskChatPanel";
import { he } from "../../i18n/he";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { reopenNoteError } from "../../utils/taskReview";
import QualityRatingStars from "./QualityRatingStars";

interface TaskCompletionReviewDialogProps {
  task: TaskOccurrence | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

export default function TaskCompletionReviewDialog({
  task,
  onClose,
  onDone,
}: TaskCompletionReviewDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [rating, setRating] = useState<number | null>(null);

  const completion = task?.completion;
  const open = Boolean(task);
  const isAwaiting = task?.status === "awaiting_response";
  const isReview = task?.status === "pending_review";

  useEffect(() => {
    setNote("");
    setError("");
    setRating(null);
  }, [task?.id]);

  const handleClose = () => {
    if (saving) return;
    setError("");
    setNote("");
    onClose();
  };

  const runAction = async (action: () => Promise<string>) => {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      const message = await action();
      setNote("");
      onDone(message);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = () => {
    if (rating == null) {
      setError(he.qualityRatingRequired);
      return;
    }
    void runAction(async () => {
      await taskService.approve(task!.id, { quality_rating: rating });
      return he.taskApprovedSuccess;
    });
  };

  const handleReopen = () => {
    const noteErr = reopenNoteError(note);
    if (noteErr) {
      setError(noteErr);
      return;
    }
    void runAction(async () => {
      await taskService.reopen(task!.id, { rejection_note: note.trim() });
      return he.taskReopenedSuccess;
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>
        {isAwaiting ? he.taskChatTitle : he.taskReviewTitle}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {task && (
          <Typography variant="subtitle1" fontWeight={700}>
            {task.title}
          </Typography>
        )}
        {task && (
          <TaskChatPanel
            key={task.id}
            occurrenceId={task.id}
            occurrenceStatus={task.status}
            chatFollowUpAt={task.chat_follow_up_at}
            chatResolvedAt={task.chat_resolved_at}
            compact
            composeEnabled={canComposeTaskChat(task.status, false) && !isReview}
            onOccurrenceUpdated={(_status, notice) => {
              onDone(notice ?? he.taskChatSent);
            }}
          />
        )}
        {task && (
          <TaskReferenceMediaDisplay
            reference_photo_url={task.reference_photo_url}
            reference_video_url={task.reference_video_url}
            reference_audio_url={task.reference_audio_url}
          />
        )}
        {isReview && completion?.note && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {he.note}
            </Typography>
            <Typography variant="body2">{completion.note}</Typography>
          </Box>
        )}
        {isReview && completion && (
          <CompletionMediaPreview
            photo_path={completion.photo_path}
            video_path={completion.video_path}
            audio_path={completion.audio_path}
            attachments={completion.completion_attachments}
            requirements={task.completion_requirements}
            audio_transcript={completion.audio_transcript}
          />
        )}

        {isReview && (
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
              {he.qualityRating}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75}>
              {he.qualityRatingHint}
            </Typography>
            <QualityRatingStars value={rating} onChange={setRating} />
          </Box>
        )}
        {isReview && (
          <TextField
            label={he.taskReopenNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            helperText={he.taskReopenNoteHint}
            fullWidth
            multiline
            minRows={2}
            disabled={saving}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>
          {he.cancel}
        </Button>
        {isReview && (
          <Button variant="outlined" color="warning" onClick={handleReopen} disabled={saving}>
            {he.taskReopen}
          </Button>
        )}
        {isReview && (
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={saving || rating == null}
          >
            {saving ? <CircularProgress size={22} color="inherit" /> : he.taskApproveClose}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
