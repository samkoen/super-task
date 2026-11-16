import { useState } from "react";
import { Alert, Box, Typography } from "@mui/material";
import ChatPhotoAnnotateReplyDialog from "../chat/ChatPhotoAnnotateReplyDialog";
import CompletionMediaPreview from "../tasks/CompletionMediaPreview";
import QualityRatingStars from "../tasks/QualityRatingStars";
import TaskChatDialog from "../tasks/TaskChatDialog";
import SkippedSlotsSection from "../tasks/review/SkippedSlotsSection";
import SlotReviewFinish from "../tasks/review/SlotReviewFinish";
import SlotReviewPanel from "../tasks/review/SlotReviewPanel";
import { useTaskReviewDecision } from "../../hooks/useTaskReviewDecision";
import type { TaskOccurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { flowColor, flowText } from "../../styles/flowTokens";
import { normalizeRequirements } from "../../utils/completionMedia";
import { managerReviewChecks, reviewSubtitle, type QueuePosition } from "../../utils/managerReview";
import { markedPhotoUrls } from "../../utils/reviewReopenPhotos";
import { NextCaption, ReviewActions, ReviewCard, ReviewChecksCard, ReviewHeader, ReviewReturnSheet } from "./ManagerReviewParts";

type Props = {
  task: TaskOccurrence;
  position: QueuePosition;
  onBack: () => void;
  onDecided: (message: string) => void;
  /** Le chat a changé le statut (la tâche repart chez l'oved) : on passe à la suivante. */
  onStatusChanged: (status: string, notice?: string) => void;
};

/** Ce que l'oved a envoyé : sous-tâches à trancher, ou les médias à regarder (photos annotables). */
function Evidence({ task, review, onMarkPhoto }: { task: TaskOccurrence; review: ReturnType<typeof useTaskReviewDecision>; onMarkPhoto: (url: string) => void }) {
  const completion = task.completion;
  if (!completion) return null;
  const pending = !review.mediaReady;
  return (
    <>
      <SkippedSlotsSection requirements={normalizeRequirements(task.completion_requirements)} attachments={completion.completion_attachments} />
      {review.slotMode ? (
        <SlotReviewPanel items={review.slots.items} drafts={review.slots.drafts} onDraftsChange={review.slots.setDrafts} videosPending={pending} disabled={review.saving} />
      ) : (
        <ReviewCard testId="review-media">
          <CompletionMediaPreview
            photo_path={completion.photo_path}
            video_path={completion.video_path}
            audio_path={completion.audio_path}
            attachments={completion.completion_attachments}
            requirements={task.completion_requirements}
            audio_transcript={completion.audio_transcript}
            videosPending={pending}
            onMarkPhoto={onMarkPhoto}
            markedPhotoUrls={markedPhotoUrls(review.marks)}
          />
        </ReviewCard>
      )}
    </>
  );
}

function OvedReport({ task }: { task: TaskOccurrence }) {
  const completion = task.completion;
  if (!completion) return null;
  const notDone = completion.status === "not_completed";
  if (!notDone && !completion.note) return null;
  return (
    <ReviewCard>
      {notDone ? <Alert severity="warning">{he.managerReviewNotSent}{completion.not_completed_reason ? ` · ${completion.not_completed_reason}` : ""}</Alert> : null}
      {completion.note ? (
        <Box>
          <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{he.managerReviewEmployeeNote}</Typography>
          <Typography sx={{ ...flowText.body, color: flowColor.neutral900 }}>{completion.note}</Typography>
        </Box>
      ) : null}
    </ReviewCard>
  );
}

function Rating({ review }: { review: ReturnType<typeof useTaskReviewDecision> }) {
  if (review.slotMode) return <SlotReviewFinish summary={review.slots.summary} rating={review.rating} onRatingChange={review.setRating} />;
  return (
    <ReviewCard title={he.managerReviewRatingTitle} testId="review-rating">
      <QualityRatingStars value={review.rating} onChange={review.setRating} />
    </ReviewCard>
  );
}

function primaryLabel(review: ReturnType<typeof useTaskReviewDecision>): string {
  if (!review.slotMode) return he.managerReviewApprove;
  return review.slots.summary.outcome === "reopen" ? he.slotReviewFinishReopen : he.managerReviewApprove;
}

type OverlaysProps = {
  task: TaskOccurrence;
  review: ReturnType<typeof useTaskReviewDecision>;
  annotateUrl: string | null;
  onCloseAnnotate: () => void;
  chatOpen: boolean;
  onCloseChat: () => void;
  onStatusChanged: Props["onStatusChanged"];
};

/** Annotation d'une photo (envoyée avec le renvoi) et chat de la tâche. */
function ReviewOverlays({ task, review, annotateUrl, onCloseAnnotate, chatOpen, onCloseChat, onStatusChanged }: OverlaysProps) {
  return (
    <>
      <ChatPhotoAnnotateReplyDialog
        photoUrl={annotateUrl}
        sending={review.saving}
        hideCaption
        submitLabel={he.reviewMarkPhotoSave}
        onClose={onCloseAnnotate}
        onSend={(file) => { if (annotateUrl) review.addMark(annotateUrl, file); onCloseAnnotate(); }}
      />
      <TaskChatDialog
        open={chatOpen}
        onClose={onCloseChat}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        employee={false}
        chatFollowUpAt={task.chat_follow_up_at}
        chatResolvedAt={task.chat_resolved_at}
        completion={task.completion ?? null}
        onOccurrenceUpdated={(status, notice) => { if (status !== "pending_review") { onCloseChat(); onStatusChanged(status, notice); } }}
      />
    </>
  );
}

/** Figma « Menahel · בדיקת משימה » : en-tête, preuve, contrôles, note, décision, carte suivante. */
export default function ManagerReviewBody({ task, position, onBack, onDecided, onStatusChanged }: Props) {
  const review = useTaskReviewDecision(task, onDecided);
  const [returning, setReturning] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [annotateUrl, setAnnotateUrl] = useState<string | null>(null);
  const blocked = !review.mediaReady;
  const primaryDisabled = blocked || (review.slotMode && !review.slots.summary.canFinish) || (!review.slotMode && review.rating == null);
  return (
    <>
      <ReviewHeader title={task.title} subtitle={reviewSubtitle(task)} index={position.index} total={position.total} onBack={onBack} onChat={() => setChatOpen(true)} />
      <OvedReport task={task} />
      <Evidence task={task} review={review} onMarkPhoto={setAnnotateUrl} />
      <ReviewChecksCard checks={managerReviewChecks(task)} />
      <Rating review={review} />
      {blocked ? <Alert severity="info">{he.reviewVideosNotReady}</Alert> : null}
      {review.error ? <Alert severity="error">{review.error}</Alert> : null}
      <ReviewActions
        primaryLabel={primaryLabel(review)}
        saving={review.saving}
        primaryDisabled={primaryDisabled}
        onPrimary={review.slotMode ? review.finishSlots : review.approve}
        onReturn={review.slotMode ? undefined : () => setReturning(true)}
        returnDisabled={blocked}
      />
      <NextCaption title={position.next?.title ?? null} />
      <ReviewReturnSheet open={returning} saving={review.saving} marksCount={review.marks.length} onClose={() => setReturning(false)} onSend={(note) => { review.reopen(note); setReturning(false); }} />
      <ReviewOverlays task={task} review={review} annotateUrl={annotateUrl} onCloseAnnotate={() => setAnnotateUrl(null)} chatOpen={chatOpen} onCloseChat={() => setChatOpen(false)} onStatusChanged={onStatusChanged} />
    </>
  );
}
