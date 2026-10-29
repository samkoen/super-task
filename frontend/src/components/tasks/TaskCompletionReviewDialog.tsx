import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Alert, Box, Button, CircularProgress, TextField, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import { taskService, type TaskOccurrence, type TaskStatus } from "../../services/taskService";
import FormDialog from "../ui/FormDialog";
import CompletionMediaPreview from "./CompletionMediaPreview";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import { OpenTaskChatButton } from "./TaskChatDialog";
import ChatPhotoAnnotateReplyDialog from "../chat/ChatPhotoAnnotateReplyDialog";
import TaskFormSection from "./form/TaskFormSection";
import SlotReviewPanel from "./review/SlotReviewPanel";
import SlotReviewFinish from "./review/SlotReviewFinish";
import { he } from "../../i18n/he";
import { canReopenClosedTask } from "../../utils/taskReopenClosed";
import { completionFinishedText } from "../../utils/completionFinishedAt";
import { DEFAULT_REVIEW_QUALITY_RATING } from "../../utils/qualityRating";
import { initialReviewMediaReady, reviewActionsBlocked } from "../../utils/reviewMediaGate";
import { normalizeRequirements } from "../../utils/completionMedia";
import { attachmentsFromCompletion } from "../../utils/completionSlotView";
import {
  buildReviewItems,
  buildReviewPayload,
  initialDrafts,
  summarizeReview,
  type SlotDrafts,
} from "../../utils/slotReview";
import {
  markedPhotoUrls,
  reopenReviewedTask,
  upsertReviewPhotoMark,
  type ReviewPhotoMark,
} from "../../utils/reviewReopenPhotos";
import { dialogSecondaryActionSx } from "../../styles/dialogUi";
import { employeeFieldSx, employeePrimaryButtonSx } from "../../styles/employeeUi";
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
  const [drafts, setDrafts] = useState<SlotDrafts>({});

  useEffect(() => {
    setTaskView(task);
  }, [task]);

  const completion = taskView?.completion;
  const finishedAt = completionFinishedText(completion?.completed_at);
  const open = Boolean(taskView);
  const isAwaiting = taskView?.status === "awaiting_response";
  const isReview = taskView?.status === "pending_review";
  const isClosed = taskView?.status === "completed";
  const isClosedApproved = canReopenClosedTask(taskView);
  const showCompletion = Boolean(completion);
  const actionsBlocked = reviewActionsBlocked({ isReview, mediaReady });

  const reviewItems = useMemo(() => {
    const requirements = normalizeRequirements(taskView?.completion_requirements);
    if (!requirements.length || completion?.status !== "completed") return [];
    return buildReviewItems(requirements, attachmentsFromCompletion(completion));
  }, [taskView?.completion_requirements, completion]);
  const slotMode = isReview && reviewItems.length > 0;
  const summary = summarizeReview(reviewItems, drafts);

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
    setDrafts(initialDrafts(reviewItems));
    // Nouveau dossier à contrôler seulement quand on change de tâche ou de soumission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskView?.id, completion?.completed_at]);

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

  const handleFinishSlots = () => {
    if (summary.outcome === "approve" && rating == null) {
      setError(he.qualityRatingRequired);
      return;
    }
    void runAction(async () => {
      const payload = await buildReviewPayload({
        items: reviewItems,
        drafts,
        rating,
        uploadPhoto: (file) => taskService.uploadPhoto(file),
      });
      const result = await taskService.reviewSlots(taskView!.id, payload);
      return result.outcome === "approved" ? he.taskApprovedSuccess : he.taskReopenedSuccess;
    });
  };

  const handleReopenClosed = () => {
    setConfirmReopenClosed(false);
    const remark = note.trim() || he.taskReopenNoteFallback;
    void runAction(async () => {
      await taskService.reopenClosed(taskView!.id, { rejection_note: remark });
      return he.taskReopenedSuccess;
    });
  };

  return (
    <>
      <FormDialog
        open={open}
        title={reviewDialogTitle(isClosed, isClosedApproved, isAwaiting)}
        onClose={handleClose}
        busy={saving}
        actions={
          <>
            <Button onClick={handleClose} disabled={saving} sx={dialogSecondaryActionSx}>
              {he.cancel}
            </Button>
            {slotMode && (
              <FinishSlotsButton
                outcome={summary.outcome}
                saving={saving}
                disabled={!summary.canFinish || actionsBlocked}
                onClick={handleFinishSlots}
              />
            )}
            {isReview && !slotMode && (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleReopen}
                disabled={saving || actionsBlocked}
                sx={dialogSecondaryActionSx}
              >
                {he.taskReopen}
              </Button>
            )}
            {isReview && !slotMode && (
              <Button
                variant="contained"
                color="success"
                onClick={handleApprove}
                disabled={saving || rating == null || actionsBlocked}
                sx={employeePrimaryButtonSx}
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
                sx={employeePrimaryButtonSx}
              >
                {he.taskReopenClosed}
              </Button>
            )}
          </>
        }
      >
        {taskView && (
          <Typography variant="h6" fontWeight={800}>
            {taskView.title}
          </Typography>
        )}
        {isClosed && taskView ? <ClosedResultFacts task={taskView} /> : null}
        {taskView && (
          <OpenTaskChatButton
            occurrenceId={taskView.id}
            title={taskView.title}
            status={taskView.status}
            employee={false}
            chatFollowUpAt={taskView.chat_follow_up_at}
            chatResolvedAt={taskView.chat_resolved_at}
            completion={taskView.completion ?? null}
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
        <CompletionFacts
          show={showCompletion}
          status={completion?.status}
          finishedAt={finishedAt}
          note={completion?.note}
          reason={completion?.not_completed_reason}
        />
        {showCompletion && completion && slotMode && (
          <SlotReviewPanel
            items={reviewItems}
            drafts={drafts}
            onDraftsChange={setDrafts}
            videosPending={!mediaReady}
            disabled={saving}
          />
        )}
        {showCompletion && completion && !slotMode && (
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
        {isReview && !slotMode && marks.length > 0 && (
          <Alert severity="info">{he.reviewMarkedPhotoCount(marks.length)}</Alert>
        )}
        {actionsBlocked && <Alert severity="info">{he.reviewVideosNotReady}</Alert>}

        {slotMode && (
          <SlotReviewFinish
            summary={summary}
            rating={rating}
            onRatingChange={setRating}
          />
        )}
        {isReview && !slotMode && (
          <TaskFormSection title={he.qualityRating}>
            <Typography color="text.secondary" sx={{ fontSize: "1rem" }}>
              {he.qualityRatingHint}
            </Typography>
            <QualityRatingStars value={rating} onChange={setRating} />
          </TaskFormSection>
        )}
        {((isReview && !slotMode) || isClosedApproved) && (
          <TextField
            label={he.taskReopenNote}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            helperText={he.taskReopenNoteHint}
            fullWidth
            multiline
            minRows={2}
            disabled={saving}
            sx={employeeFieldSx}
          />
        )}

        {error && <Alert severity="error">{error}</Alert>}
      </FormDialog>
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

function FinishSlotsButton({
  outcome,
  saving,
  disabled,
  onClick,
}: {
  outcome: "pending" | "approve" | "reopen";
  saving: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const reopen = outcome === "reopen";
  const label = reopen ? he.slotReviewFinishReopen : he.slotReviewFinishApprove;
  return (
    <Button
      variant="contained"
      color={reopen ? "warning" : "success"}
      onClick={onClick}
      disabled={saving || disabled}
      sx={employeePrimaryButtonSx}
    >
      {saving ? <CircularProgress size={22} color="inherit" /> : label}
    </Button>
  );
}

function CompletionFacts({
  show,
  status,
  finishedAt,
  note,
  reason,
}: {
  show: boolean;
  status?: "completed" | "not_completed";
  finishedAt: string | null;
  note?: string | null;
  reason?: string | null;
}): ReactElement | null {
  if (!show || !status) return null;
  return (
    <>
      <Box>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={1}>
          <CompletionOutcomeChip status={status} />
          {finishedAt && (
            <Typography variant="body2" fontWeight={700} dir="ltr">
              {finishedAt}
            </Typography>
          )}
        </Box>
        {status === "not_completed" && (
          <Alert severity="warning">
            {he.taskNotCompletedAlert}
            {reason ? (
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {he.notCompletedReason}: {reason}
              </Typography>
            ) : null}
          </Alert>
        )}
      </Box>
      {note ? (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            {he.note}
          </Typography>
          <Typography variant="body2">{note}</Typography>
        </Box>
      ) : null}
    </>
  );
}

function reviewDialogTitle(isClosed: boolean, approved: boolean, awaiting: boolean): string {
  if (approved) return he.taskClosedDetailTitle;
  if (isClosed) return he.taskClosedSummaryTitle;
  if (awaiting) return he.taskChatTitle;
  return he.taskReviewTitle;
}

function ClosedResultFacts({ task }: { task: TaskOccurrence }) {
  const who = task.assignee_name?.trim();
  const stars = task.completion?.quality_rating;
  if (!who && stars == null) return null;
  return (
    <Box>
      {who ? (
        <Typography variant="body2" color="text.secondary">
          {he.taskClosedBy(who)}
        </Typography>
      ) : null}
      {stars != null ? (
        <Box mt={who ? 1 : 0}>
          <Typography variant="subtitle2" fontWeight={700} mb={0.5}>
            {he.qualityRating}
          </Typography>
          <QualityRatingStars value={stars} readOnly />
        </Box>
      ) : null}
    </Box>
  );
}
