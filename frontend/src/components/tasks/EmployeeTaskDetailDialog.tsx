import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { EMPLOYEE_INK, EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";
import DeliveryLineCheck from "./DeliveryLineCheck";
import TaskReferenceMediaDialog, { hasTaskReferenceMedia } from "./TaskReferenceMediaDialog";
import CompletionMediaPreview from "./CompletionMediaPreview";
import CompletionHintDialog from "./CompletionHintDialog";
import EmployeeCaptureSteps, { type SlotHints } from "./EmployeeCaptureSteps";
import EmployeeTaskActionsBar from "./EmployeeTaskActionsBar";
import CompletionOutcomeChip from "./CompletionOutcomeChip";
import TaskChatDialog from "./TaskChatDialog";
import { ToolButtons, type StepHintControls } from "./SubtaskTileParts";
import TaskStatusChip from "./TaskStatusChip";
import { he } from "../../i18n/he";
import { useSlotHintPlayback } from "../../hooks/useSlotHintPlayback";
import { taskSpeechText } from "../../utils/captureGuide";
import { formatDueAt } from "../../utils/dateView";
import { normalizeStartUrl, openExternalUrl } from "../../utils/startUrl";
import { canDoTask } from "../../utils/employeeDoTask";
import { showsCompletionOutcome } from "../../utils/employeeIncompleteSubmit";
import { employeeDisplayStatus } from "../../utils/employeeDashboardSections";
import { rejectionRemark } from "../../utils/taskReview";
import { effectiveRequirements } from "../../utils/completionMedia";
import { attachmentsFromCompletion } from "../../utils/completionSlotView";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { ExtraSlot } from "../../utils/extraCompletionMedia";
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
  extras?: ExtraSlot[];
  onExtrasChange?: (next: ExtraSlot[]) => void;
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  slotsFilled?: boolean;
  saving: boolean;
  onAnnotatingChange?: (busy: boolean) => void;
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
  chatFirst?: boolean;
}

/** Ouverture tâche côté oved : consigne, étapes à réaliser, puis un seul gros bouton. */
export default function EmployeeTaskDetailDialog({
  task,
  titleNode,
  onClose,
  onDoTask,
  onChatUpdated,
  starting = false,
  language = "he",
  capture,
  chatFirst = false,
}: EmployeeTaskDetailDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const hints = useSlotHintPlayback(language);
  const [question, setQuestion] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const taskId = task?.id;
  useEffect(() => {
    if (chatFirst && taskId) setChatOpen(true);
  }, [chatFirst, taskId]);
  if (!task) return null;
  const liveCapture = capture && canDoTask(task.status) ? capture : undefined;

  return (
    <Dialog
      open={Boolean(task)}
      onClose={onClose}
      fullWidth
      fullScreen={fullScreen}
      maxWidth="sm"
      dir="rtl"
      PaperProps={{ sx: { overflow: "hidden", display: "flex", flexDirection: "column" } }}
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <TaskDialogHeader
        onClose={onClose}
        meta={
          <TaskStatusRow
            task={task}
            hints={hints}
            onChat={() => setChatOpen(true)}
            onReference={hasTaskReferenceMedia(task) ? () => setReferenceOpen(true) : undefined}
          />
        }
      >
        {titleNode ?? task.title}
      </TaskDialogHeader>
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          pt: 2,
          px: { xs: 2, sm: 3 },
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          bgcolor: alpha(EMPLOYEE_INK, 0.03),
        }}
      >
        <TaskRejectionRemark completion={task.completion} />
        <DeliveryLineCheck occurrenceId={task.id} disabled={!canDoTask(task.status)} />
        <StartUrlButton url={task.start_url} fullWidth />
        <TaskDetailMedia task={task} hints={hints} capture={liveCapture} onAsk={setQuestion} />
      </DialogContent>
      <EmployeeTaskActionsBar
        status={task.status}
        requirements={effectiveRequirements(task)}
        capture={liveCapture}
        onClose={onClose}
        onDoTask={onDoTask}
        starting={starting}
      />
      <TaskReferenceMediaDialog open={referenceOpen} media={task} onClose={() => setReferenceOpen(false)} />
      {hints.dialog ? (
        <CompletionHintDialog title={hints.dialog.title} text={hints.dialog.text} onClose={hints.closeDialog} />
      ) : null}
      <TaskChatDialog
        open={chatOpen || question !== null}
        onClose={() => {
          setChatOpen(false);
          setQuestion(null);
        }}
        occurrenceId={task.id}
        title={task.title}
        status={task.status}
        employee
        completion={task.completion ?? null}
        initialDraft={question ? he.subtaskQuestionDraft(question) : undefined}
        onOccurrenceUpdated={() => onChatUpdated?.()}
      />
    </Dialog>
  );
}

function TaskDialogHeader({
  children,
  meta,
  onClose,
}: {
  children: ReactNode;
  meta?: ReactNode;
  onClose: () => void;
}) {
  return (
    <DialogTitle
      component="div"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        pt: "calc(14px + env(safe-area-inset-top, 0px))",
        pb: 1.5,
        px: { xs: 2, sm: 3 },
        flexShrink: 0,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: "1.35rem",
            fontWeight: 800,
            lineHeight: 1.3,
            overflowWrap: "anywhere",
          }}
        >
          {children}
        </Box>
        <IconButton
          aria-label={he.close}
          onClick={onClose}
          sx={{
            bgcolor: alpha(EMPLOYEE_INK, 0.06),
            width: EMPLOYEE_TOUCH_MIN - 8,
            height: EMPLOYEE_TOUCH_MIN - 8,
            flexShrink: 0,
          }}
        >
          <CloseRoundedIcon />
        </IconButton>
      </Box>
      {meta}
    </DialogTitle>
  );
}

function TaskRejectionRemark({ completion }: { completion?: TaskCompletion | null }) {
  const remark = rejectionRemark(completion);
  if (!remark) return null;
  return (
    <Alert severity="warning" sx={{ borderRadius: "14px", fontSize: "1rem", fontWeight: 700 }}>
      {he.taskRejectedReopen}
      {remark !== he.taskRejectedReopen ? (
        <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap", fontWeight: 400 }}>
          {remark}
        </Typography>
      ) : null}
    </Alert>
  );
}

/** Lire / écouter la tâche entière : mêmes contrôles que ceux d'une sous-tâche. */
function taskHintControls(
  title: string,
  description: string | null | undefined,
  hints: SlotHints,
): StepHintControls | undefined {
  const text = taskSpeechText(title, description);
  if (!text) return undefined;
  const id = "task-hint";
  return {
    speaking: hints.speakingId === id,
    loading: hints.loadingId === id,
    listenEnabled: true,
    onShow: () => void hints.show(id, text, title),
    onSpeak: () => void hints.speak(id, text),
  };
}

/** Statut + heure en petit, et à droite les trois icônes lire / écouter / chat. */
function TaskStatusRow({
  task,
  hints,
  onChat,
  onReference,
}: {
  task: EmployeeTaskDetailTask;
  hints: SlotHints;
  onChat: () => void;
  /** Présent seulement si le menahel a joint une image, une vidéo ou un audio. */
  onReference?: () => void;
}) {
  return (
    <Box data-testid="task-status-row" display="flex" columnGap={1} rowGap={0.75} flexWrap="wrap" alignItems="center">
      <TaskStatusChip status={employeeDisplayStatus(task.status)} />
      {task.completion && showsCompletionOutcome(task.status) ? (
        <CompletionOutcomeChip status={task.completion.status} />
      ) : null}
      <Typography color="text.secondary" dir="ltr" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
        {he.dueAt}: {formatDueAt(task.due_at)}
      </Typography>
      <Box data-testid="task-tools" sx={{ display: "flex", gap: 0.75, marginInlineStart: "auto", flexShrink: 0 }}>
        <ToolButtons
          hintControls={taskHintControls(task.title, task.description, hints)}
          onAsk={onChat}
          askLabel={he.taskChatSection}
          onHelp={onReference}
          onDark={false}
        />
      </Box>
    </Box>
  );
}

function TaskDetailMedia({
  task,
  hints,
  capture,
  onAsk,
}: {
  task: EmployeeTaskDetailTask;
  hints: SlotHints;
  capture?: EmployeeTaskCaptureProps;
  onAsk: (title: string) => void;
}) {
  const requirements = effectiveRequirements(task);
  const hasRef = Boolean(
    task.reference_photo_url || task.reference_video_url || task.reference_audio_url,
  );
  const hasCompletionMedia = attachmentsFromCompletion(task.completion).length > 0;

  return (
    <>
      {capture ? (
        <EmployeeCaptureSteps
          requirements={requirements}
          slots={capture.slots}
          onChange={capture.onSlotsChange}
          disabled={capture.saving}
          hints={hints}
          onAsk={onAsk}
          onAnnotatingChange={capture.onAnnotatingChange}
        />
      ) : (
        <CompletionMediaPreview
          viewer="employee"
          photo_path={task.completion?.photo_path}
          video_path={task.completion?.video_path}
          audio_path={task.completion?.audio_path}
          attachments={task.completion?.completion_attachments}
          requirements={requirements}
          audio_transcript={task.completion?.audio_transcript}
          audio_transcript_employee={task.completion?.audio_transcript_employee}
        />
      )}
      {!hasRef && !hasCompletionMedia && !capture && requirements.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {he.taskNoReferenceMedia}
        </Typography>
      )}
    </>
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
      sx={{ minHeight: 52, borderRadius: "14px", fontSize: "1.05rem", fontWeight: 800 }}
    >
      {he.openStartUrl}
    </Button>
  );
}
