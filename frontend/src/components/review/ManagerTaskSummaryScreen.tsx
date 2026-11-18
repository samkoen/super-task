import { useState } from "react";
import { Alert, ButtonBase, CircularProgress } from "@mui/material";
import CompletionMediaPreview from "../tasks/CompletionMediaPreview";
import QualityRatingStars from "../tasks/QualityRatingStars";
import TaskChatDialog from "../tasks/TaskChatDialog";
import SkippedSlotsSection from "../tasks/review/SkippedSlotsSection";
import { studioSecondarySx } from "../tasks/fixed/studio/studioUi";
import { useClosedTaskReopen } from "../../hooks/useClosedTaskReopen";
import type { TaskOccurrence } from "../../services/taskService";
import { he } from "../../i18n/he";
import { flowColor } from "../../styles/flowTokens";
import { normalizeRequirements } from "../../utils/completionMedia";
import { managerReviewChecks, reviewSubtitle } from "../../utils/managerReview";
import { canReopenClosedTask } from "../../utils/taskReopenClosed";
import { OvedReport } from "./ManagerReviewBody";
import { ReviewCard, ReviewChecksCard, ReviewHeader, ReviewReturnSheet } from "./ManagerReviewParts";
import { ReviewLoading, ReviewScreenShell, useReviewTask } from "./ManagerReviewScreen";

type Props = {
  /** Tâche fermée à résumer (la version fraîche est rechargée à l'ouverture). */
  taskId: string | null;
  onClose: () => void;
  /** Après une réouverture (ou un changement venu du chat) : message, puis rechargement de la liste. */
  onDone: (message?: string) => void;
};

/** Ce que l'oved a envoyé, en lecture seule (sous-tâches non filmées, puis photos et vidéos). */
function SentProof({ task }: { task: TaskOccurrence }) {
  const completion = task.completion;
  if (!completion) return null;
  return (
    <>
      <SkippedSlotsSection requirements={normalizeRequirements(task.completion_requirements)} attachments={completion.completion_attachments} />
      <ReviewCard testId="summary-media">
        <CompletionMediaPreview
          photo_path={completion.photo_path}
          video_path={completion.video_path}
          audio_path={completion.audio_path}
          attachments={completion.completion_attachments}
          requirements={task.completion_requirements}
          audio_transcript={completion.audio_transcript}
        />
      </ReviewCard>
    </>
  );
}

function RatingCard({ task }: { task: TaskOccurrence }) {
  const stars = task.completion?.quality_rating;
  if (stars == null) return null;
  return (
    <ReviewCard title={he.qualityRating} testId="summary-rating">
      <QualityRatingStars value={stars} readOnly />
    </ReviewCard>
  );
}

function statusLabel(task: TaskOccurrence): string {
  return canReopenClosedTask(task) ? he.taskClosedDetailTitle : he.taskClosedSummaryTitle;
}

type BodyProps = { task: TaskOccurrence; onBack: () => void; onDone: Props["onDone"] };

/** Figma « Menahel · בדיקת משימה », version tâche fermée : mêmes cartes, et « פתח מחדש » au lieu d'« אישור ». */
function SummaryBody({ task, onBack, onDone }: BodyProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const reopen = useClosedTaskReopen(task.id, onDone);
  return (
    <>
      <ReviewHeader title={task.title} subtitle={reviewSubtitle(task)} status={statusLabel(task)} onBack={onBack} onChat={() => setChatOpen(true)} />
      <OvedReport task={task} />
      <SentProof task={task} />
      <ReviewChecksCard checks={managerReviewChecks(task)} />
      <RatingCard task={task} />
      {reopen.error ? <Alert severity="error">{reopen.error}</Alert> : null}
      {canReopenClosedTask(task) ? (
        <ButtonBase data-testid="summary-reopen" disabled={reopen.saving} onClick={reopen.ask} sx={studioSecondarySx}>
          {reopen.saving ? <CircularProgress size={22} sx={{ color: flowColor.neutral900 }} /> : he.taskReopenClosed}
        </ButtonBase>
      ) : null}
      <ReviewReturnSheet open={reopen.asking} saving={reopen.saving} marksCount={0} onClose={reopen.cancel} onSend={reopen.send} sendLabel={he.taskReopenClosed} />
      <TaskChatDialog
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        employee={false}
        chatFollowUpAt={task.chat_follow_up_at}
        chatResolvedAt={task.chat_resolved_at}
        completion={task.completion ?? null}
        onOccurrenceUpdated={(status, notice) => { if (status !== task.status) { setChatOpen(false); onDone(notice); } }}
      />
    </>
  );
}

/** Ouvrir une tâche terminée (onglet משימות, fiche d'un oved, accueil) : le résumé plein écran du FLOW. */
export default function ManagerTaskSummaryScreen({ taskId, onClose, onDone }: Props) {
  const { task, error } = useReviewTask(taskId);
  const done = (message?: string) => { onDone(message); onClose(); };
  return (
    <ReviewScreenShell open={Boolean(taskId)} onClose={onClose} testId="manager-task-summary">
      {task ? <SummaryBody key={task.id} task={task} onBack={onClose} onDone={done} /> : <ReviewLoading title={he.taskClosedSummaryTitle} error={error} onBack={onClose} />}
    </ReviewScreenShell>
  );
}
