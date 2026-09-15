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
import { taskService, type TaskOccurrence, type TaskStatus } from "../../services/taskService";
import CompletionMediaPreview from "./CompletionMediaPreview";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import TaskChatPanel from "./TaskChatPanel";
import ChatPhotoAnnotateReplyDialog from "../chat/ChatPhotoAnnotateReplyDialog";
import { he } from "../../i18n/he";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { canReopenClosedTask } from "../../utils/taskReopenClosed";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import { DEFAULT_REVIEW_QUALITY_RATING } from "../../utils/qualityRating";
import { initialReviewMediaReady, reviewActionsBlocked } from "../../utils/reviewMediaGate";
import {
  markedPhotoUrls,
  reopenReviewedTask,
  upsertReviewPhotoMark,
  type ReviewPhotoMark,
} from "../../utils/reviewReopenPhotos";
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
  const [mediaReady, setMediaReady] = useState(true);
  const [marks, setMarks] = useState<ReviewPhotoMark[]>([]);
  const [annotateUrl, setAnnotateUrl] = useState<string | null>(null);
  const [taskView, setTaskView] = useState<TaskOccurrence | null>(task);

  useEffect(() => {
    setTaskView(task);
  }, [task]);

  const completion = taskView?.completion;
  const open = Boolean(taskView);
  const isAwaiting = taskView?.status === "awaiting_response";
  const isReview = taskView?.status === "pending_review";
  const isClosedApproved = canReopenClosedTask(taskView);
  const showCompletion = Boolean(completion);
  const actionsBlocked = reviewActionsBlocked({ isReview, mediaReady });

  useEffect(() => {
    setNote("");
    setError("");
    setConfirmReopenClosed(false);
    setRating(DEFAULT_REVIEW_QUALITY_RATING);
    setMediaReady(initialReviewMediaReady(taskView?.completion?.media_ready));
    setMarks([]);
    setAnnotateUrl(null);
  }, [taskView?.id, taskView?.completion?.media_ready]);

  useEffect(() => {
    const taskId = taskView?.id;
    if (!open || !isReview || mediaReady || !taskId) return undefined;
    let stop = false;
    const tick = async () => {
      try {
        const result = await taskService.confirmMedia(taskId);
        if (!stop && result.media_ready) setMediaReady(true);
      } catch {
        /* retry next tick */
      }
    };
    const timer = window.setInterval(() => void tick(), 2000);
    void tick();
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [open, isReview, mediaReady, taskView?.id]);

  const handleChatUpdated = (status: string, notice?: string) => {
    setTaskView((prev) => {
      if (!prev) return prev;
      return { ...prev, status: status as TaskStatus };
    });
    if (notice !== he.taskChatSent) {
      onDone(notice ?? he.taskChatSent);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setError("");
    setNote("");
    setConfirmReopenClosed(false);
    onClose();
  };

  const runAction = async (action: () => Promise<string>) => {
    if (!taskView) return;
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
      await taskService.approve(taskView!.id, { quality_rating: rating });
      return he.taskApprovedSuccess;
    });
  };

  const handleReopen = () => {
    void runAction(async () => {
      await reopenReviewedTask({
        occurrenceId: taskView!.id,
        note,
        fallbackNote: he.taskReopenNoteFallback,
        marks,
      });
      return he.taskReopenedSuccess;
    });
  };

  const handleReopenClosed = () => {
    setConfirmReopenClosed(false);
    void runAction(async () => {
      await taskService.reopenClosed(taskView!.id);
      return he.taskReopenedSuccess;
    });
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      dir="rtl"
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>
        {isClosedApproved ? he.taskClosedDetailTitle : isAwaiting ? he.taskChatTitle : he.taskReviewTitle}
      </DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {taskView && (
          <Typography variant="subtitle1" fontWeight={700}>
            {taskView.title}
          </Typography>
        )}
        {taskView && (
          <TaskChatPanel
            key={taskView.id}
            occurrenceId={taskView.id}
            occurrenceStatus={taskView.status}
            chatFollowUpAt={taskView.chat_follow_up_at}
            chatResolvedAt={taskView.chat_resolved_at}
            compact
            composeEnabled={canComposeTaskChat(taskView.status, false)}
            onOccurrenceUpdated={handleChatUpdated}
          />
        )}
        {taskView && (
          <TaskReferenceMediaDisplay
            reference_photo_url={taskView.reference_photo_url}
            reference_video_url={taskView.reference_video_url}
            reference_audio_url={taskView.reference_audio_url}
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
            requirements={taskView.completion_requirements}
            audio_transcript={completion.audio_transcript}
            videosPending={isReview && !mediaReady}
            onMarkPhoto={isReview ? setAnnotateUrl : undefined}
            markedPhotoUrls={markedPhotoUrls(marks)}
          />
        )}
        {isReview && marks.length > 0 && (
          <Alert severity="info">{he.reviewMarkedPhotoCount(marks.length)}</Alert>
        )}
        {actionsBlocked && (
          <Alert severity="info">{he.reviewVideosNotReady}</Alert>
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
          <Button variant="outlined" color="warning" onClick={handleReopen} disabled={saving || actionsBlocked}>
            {he.taskReopen}
          </Button>
        )}
        {isReview && (
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={saving || rating == null || actionsBlocked}
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
    <ChatPhotoAnnotateReplyDialog
      photoUrl={annotateUrl}
      sending={saving}
      hideCaption
      submitLabel={he.reviewMarkPhotoSave}
      onClose={() => setAnnotateUrl(null)}
      onSend={(file) => {
        if (!annotateUrl) return;
        setMarks((prev) => upsertReviewPhotoMark(prev, { sourceUrl: annotateUrl, file }));
        setAnnotateUrl(null);
      }}
    />
    <ClosedTaskReopenConfirm
      open={confirmReopenClosed}
      saving={saving}
      onCancel={() => setConfirmReopenClosed(false)}
      onConfirm={handleReopenClosed}
    />
    </>
  );
}
