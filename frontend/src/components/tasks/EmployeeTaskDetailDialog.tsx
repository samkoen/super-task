import { type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import CompletionMediaPreview from "./CompletionMediaPreview";
import CompletionRequirementSlots from "./CompletionRequirementSlots";
import CompletionSlotGrid from "./CompletionSlotGrid";
import EmployeeDoTaskButton from "./EmployeeDoTaskButton";
import TaskChatPanel from "./TaskChatPanel";
import TaskStatusChip from "./TaskStatusChip";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { normalizeStartUrl, openExternalUrl } from "../../utils/startUrl";
import { canComposeTaskChat } from "../../utils/taskChatCompose";
import { canDoTask } from "../../utils/employeeDoTask";
import { rejectionRemark } from "../../utils/taskReview";
import { effectiveRequirements } from "../../utils/completionMedia";
import {
  attachmentsFromCompletion,
  fillsFromAttachments,
  visualSlotCount,
} from "../../utils/completionSlotView";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import type { TaskCompletion, TaskStatus } from "../../services/taskService";

export interface EmployeeTaskDetailTask {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_at: string;
  completion_requirements?: CompletionRequirement[] | null;
  photo_required?: boolean;
  min_video_seconds?: number | null;
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  completion?: TaskCompletion | null;
  start_url?: string | null;
}

export type EmployeeTaskCaptureProps = {
  slots: Array<PendingMedia | null>;
  onSlotsChange: (next: Array<PendingMedia | null>) => void;
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  saving: boolean;
};

export interface EmployeeTaskDetailDialogProps {
  task: EmployeeTaskDetailTask | null;
  titleNode?: ReactNode;
  onClose: () => void;
  onDoTask?: () => void;
  onChatUpdated?: () => void;
  starting?: boolean;
  language?: EmployeeLanguage;
  capture?: EmployeeTaskCaptureProps;
}

/** Ouverture tâche côté oved : cases, capture et chat dans le même écran. */
export default function EmployeeTaskDetailDialog({
  task,
  titleNode,
  onClose,
  onDoTask,
  onChatUpdated,
  starting = false,
  language = "he",
  capture,
}: EmployeeTaskDetailDialogProps) {
  if (!task) return null;
  const liveCapture = capture && canDoTask(task.status) ? capture : undefined;
  const remark = rejectionRemark(task.completion);

  return (
    <Dialog open={Boolean(task)} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{titleNode ?? task.title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <TaskStatusRow task={task} />
        {task.description ? (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
            {task.description}
          </Typography>
        ) : null}
        <StartUrlButton url={task.start_url} fullWidth />
        {remark ? (
          <Alert severity="warning">
            {he.taskRejectedReopen}
            {remark !== he.taskRejectedReopen ? (
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {remark}
              </Typography>
            ) : null}
          </Alert>
        ) : null}
        <TaskDetailMedia task={task} language={language} capture={liveCapture} />
        <TaskChatPanel
          key={task.id}
          occurrenceId={task.id}
          compact
          composeEnabled={canComposeTaskChat(task.status, true)}
          onOccurrenceUpdated={() => onChatUpdated?.()}
        />
      </DialogContent>
      <TaskDetailActions
        task={task}
        onClose={onClose}
        capture={liveCapture}
        onDoTask={onDoTask}
        starting={starting}
      />
    </Dialog>
  );
}

function TaskStatusRow({ task }: { task: EmployeeTaskDetailTask }) {
  return (
    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
      <TaskStatusChip status={task.status} />
      <Typography variant="caption" color="text.secondary" dir="ltr">
        {he.dueAt}: {formatDueAt(task.due_at)}
      </Typography>
    </Box>
  );
}

function TaskDetailMedia({
  task,
  language,
  capture,
}: {
  task: EmployeeTaskDetailTask;
  language: EmployeeLanguage;
  capture?: EmployeeTaskCaptureProps;
}) {
  const requirements = effectiveRequirements(task);
  const attachments = attachmentsFromCompletion(task.completion);
  const hasVisual = visualSlotCount(requirements) > 0;
  const hasRef = Boolean(
    task.reference_photo_url || task.reference_video_url || task.reference_audio_url,
  );
  const hasLegacyCompletion = attachments.length > 0 && !hasVisual;

  return (
    <>
      <TaskReferenceMediaDisplay
        reference_photo_url={task.reference_photo_url}
        reference_video_url={task.reference_video_url}
        reference_audio_url={task.reference_audio_url}
      />
      {capture ? (
        <TaskLiveCapture requirements={requirements} capture={capture} language={language} />
      ) : (
        <TaskPreviewSlots
          requirements={requirements}
          attachments={attachments}
          language={language}
          hasVisual={hasVisual}
        />
      )}
      {hasLegacyCompletion && <TaskLegacyCompletion task={task} />}
      {!hasRef && !hasVisual && !hasLegacyCompletion && !capture && (
        <Typography variant="body2" color="text.secondary">
          {he.taskNoReferenceMedia}
        </Typography>
      )}
    </>
  );
}

function TaskLegacyCompletion({ task }: { task: EmployeeTaskDetailTask }) {
  return (
    <CompletionMediaPreview
      viewer="employee"
      photo_path={task.completion?.photo_path}
      video_path={task.completion?.video_path}
      audio_path={task.completion?.audio_path}
      attachments={task.completion?.completion_attachments}
      audio_transcript={task.completion?.audio_transcript}
      audio_transcript_employee={task.completion?.audio_transcript_employee}
    />
  );
}

function TaskLiveCapture({
  requirements,
  capture,
  language,
}: {
  requirements: CompletionRequirement[];
  capture: EmployeeTaskCaptureProps;
  language: EmployeeLanguage;
}) {
  return (
    <>
      <CompletionRequirementSlots
        requirements={requirements}
        slots={capture.slots}
        onChange={capture.onSlotsChange}
        disabled={capture.saving}
        language={language}
      />
      <TextField
        label={he.note}
        value={capture.note}
        onChange={(e) => capture.onNoteChange(e.target.value)}
        fullWidth
        multiline
        rows={2}
        placeholder={he.completionMediaHint}
      />
      {!capture.canSubmit && (
        <Typography variant="caption" color="warning.main">
          {he.completionFillSlotsHint}
        </Typography>
      )}
    </>
  );
}

function TaskPreviewSlots({
  requirements,
  attachments,
  language,
  hasVisual,
}: {
  requirements: CompletionRequirement[];
  attachments: ReturnType<typeof attachmentsFromCompletion>;
  language: EmployeeLanguage;
  hasVisual: boolean;
}) {
  if (!hasVisual) return null;
  return (
    <CompletionSlotGrid
      requirements={requirements}
      fills={fillsFromAttachments(requirements, attachments)}
      language={language}
    />
  );
}

function TaskDetailActions({
  task,
  onClose,
  capture,
  onDoTask,
  starting,
}: {
  task: EmployeeTaskDetailTask;
  onClose: () => void;
  capture?: EmployeeTaskCaptureProps;
  onDoTask?: () => void;
  starting: boolean;
}) {
  return (
    <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
      <Button onClick={onClose}>{he.close}</Button>
      {capture ? (
        <EmployeeDoTaskButton
          status={task.status}
          starting={capture.saving}
          disabled={!capture.canSubmit}
          onClick={capture.onSubmit}
        />
      ) : onDoTask ? (
        <EmployeeDoTaskButton status={task.status} starting={starting} onClick={onDoTask} />
      ) : null}
    </DialogActions>
  );
}

function StartUrlButton({
  url,
  fullWidth = false,
}: {
  url?: string | null;
  fullWidth?: boolean;
}) {
  const clean = normalizeStartUrl(url);
  if (!clean) return null;
  return (
    <Button
      variant={fullWidth ? "contained" : "outlined"}
      color="info"
      fullWidth={fullWidth}
      startIcon={<OpenInNewIcon />}
      onClick={() => openExternalUrl(clean)}
    >
      {he.openStartUrl}
    </Button>
  );
}
