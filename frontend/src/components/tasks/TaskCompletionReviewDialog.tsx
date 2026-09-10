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
import { canReopenClosedTask } from "../../utils/taskReopenClosed";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import { DEFAULT_REVIEW_QUALITY_RATING } from "../../utils/qualityRating";
import ClosedTaskReopenConfirm from "./ClosedTaskReopenConfirm";
import CompletionOutcomeChip from "./CompletionOutcomeChip";
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
  const [rating, setRating] = useState<number | null>(DEFAULT_REVIEW_QUALITY_RATING);
  const [confirmReopenClosed, setConfirmReopenClosed] = useState(false);

  const completion = task?.completion;
  const open = Boolean(task);
  const isAwaiting = task?.status === "awaiting_response";
  const isReview = task?.status === "pending_review";
  const isClosedApproved = canReopenClosedTask(task);
  const showCompletion = Boolean(completion);

  useEffect(() => {
    setNote("");
    setError("");
    setConfirmReopenClosed(false);
    setRating(DEFAULT_REVIEW_QUALITY_RATING);
  }, [task?.id]);

  const handleClose = () => {
    if (saving) return;
    setError("");
    setNote("");
    setConfirmReopenClosed(false);
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
    void runAction(async () => {
      await taskService.reopen(task!.id, {
        rejection_note: note.trim() || he.taskReopenNoteFallback,
      });
      return he.taskReopenedSuccess;
    });
  };

  const handleReopenClosed = () => {
    setConfirmReopenClosed(false);
    void runAction(async () => {
      await taskService.reopenClosed(task!.id);
      return he.taskReopenedSuccess;
    });
  };

  return (
    <>
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>
        {isClosedApproved ? he.taskClosedDetailTitle : isAwaiting ? he.taskChatTitle : he.taskReviewTitle}
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
              if (notice !== he.taskChatSent) {
                onDone(notice ?? he.taskChatSent);
              }
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
        {showCompletion && completion && (
          <Box>
            <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1}>
              <CompletionOutcomeChip status={completion.status} />
            </Box>
            {completion.status === "not_completed" && (
              <Alert severity="warning">
                {he.taskNotCompletedAlert}
                {completion.not_completed_reason ? (
                  <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                    {he.notCompletedReason}: {completion.not_completed_reason}
                  </Typography>
                ) : null}
              </Alert>
            )}
          </Box>
        )}
        {showCompletion && completion?.note && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {he.note}
            </Typography>
            <Typography variant="body2">{completion.note}</Typography>
          </Box>
        )}
        {showCompletion && completion && (
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
      <DialogActions
        sx={{
          px: 3,
          pb: dialogActionsPbCss(),
          flexWrap: "wrap",
          gap: 1,
          flexDirection: { xs: "column", sm: "row" },
          "& > :not(style)": { width: { xs: "100%", sm: "auto" } },
        }}
      >
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
        {isClosedApproved && (
          <Button
            variant="contained"
            color="warning"
            onClick={() => setConfirmReopenClosed(true)}
            disabled={saving}
          >
            {he.taskReopenClosed}
          </Button>
        )}
      </DialogActions>
    </Dialog>
    <ClosedTaskReopenConfirm
      open={confirmReopenClosed}
      saving={saving}
      onCancel={() => setConfirmReopenClosed(false)}
      onConfirm={handleReopenClosed}
    />
    </>
  );
}
