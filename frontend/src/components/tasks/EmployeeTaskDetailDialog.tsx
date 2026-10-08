import { type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { EMPLOYEE_BRAND, EMPLOYEE_CARD_RADIUS, EMPLOYEE_INK, EMPLOYEE_TOUCH_MIN, employeeFieldSx } from "../../styles/employeeUi";
import TaskReferenceMediaDisplay from "./TaskReferenceMediaDisplay";
import CompletionMediaPreview from "./CompletionMediaPreview";
import EmployeeCaptureSteps from "./EmployeeCaptureSteps";
import EmployeeTaskActionsBar from "./EmployeeTaskActionsBar";
import ExtraCompletionMedia from "./ExtraCompletionMedia";
import CompletionOutcomeChip from "./CompletionOutcomeChip";
import CollapsibleSection from "../ui/CollapsibleSection";
import { OpenTaskChatButton } from "./TaskChatDialog";
import TaskStatusChip from "./TaskStatusChip";
import { he } from "../../i18n/he";
import { formatDueAt } from "../../utils/dateView";
import { normalizeStartUrl, openExternalUrl } from "../../utils/startUrl";
import { canDoTask } from "../../utils/employeeDoTask";
import { showsCompletionOutcome } from "../../utils/employeeIncompleteSubmit";
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
      <TaskDialogHeader onClose={onClose}>{titleNode ?? task.title}</TaskDialogHeader>
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
        <TaskStatusRow task={task} />
        <TaskRejectionRemark completion={task.completion} />
        <TaskDescription text={task.description} />
        <StartUrlButton url={task.start_url} fullWidth />
        <OpenTaskChatButton
          occurrenceId={task.id}
          title={task.title}
          status={task.status}
          employee
          completion={task.completion ?? null}
          onOccurrenceUpdated={() => onChatUpdated?.()}
          autoOpen={chatFirst}
        />
        <TaskDetailMedia task={task} language={language} capture={liveCapture} />
        {liveCapture ? <OptionalSections capture={liveCapture} /> : null}
      </DialogContent>
      <EmployeeTaskActionsBar
        status={task.status}
        requirements={effectiveRequirements(task)}
        capture={liveCapture}
        onClose={onClose}
        onDoTask={onDoTask}
        starting={starting}
      />
    </Dialog>
  );
}

function TaskDialogHeader({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <DialogTitle
      component="div"
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 1,
        pt: "calc(16px + env(safe-area-inset-top, 0px))",
        pb: 1.5,
        flexShrink: 0,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box flex={1} minWidth={0}>
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

/** Consigne du manager : carte bien lisible avec filet de couleur. */
function TaskDescription({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: "background.paper",
        borderRadius: EMPLOYEE_CARD_RADIUS,
        borderInlineStart: `6px solid ${EMPLOYEE_BRAND}`,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 800, color: EMPLOYEE_BRAND }}>
        {he.taskWhatToDo}
      </Typography>
      <Typography sx={{ whiteSpace: "pre-wrap", fontSize: "1.1rem", lineHeight: 1.6, mt: 0.25 }}>
        {text}
      </Typography>
    </Box>
  );
}

function TaskStatusRow({ task }: { task: EmployeeTaskDetailTask }) {
  return (
    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
      <TaskStatusChip status={task.status} />
      {task.completion && showsCompletionOutcome(task.status) ? (
        <CompletionOutcomeChip status={task.completion.status} />
      ) : null}
      <Typography variant="body2" color="text.secondary" dir="ltr" sx={{ fontWeight: 600 }}>
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
  const hasRef = Boolean(
    task.reference_photo_url || task.reference_video_url || task.reference_audio_url,
  );
  const hasCompletionMedia = attachmentsFromCompletion(task.completion).length > 0;

  return (
    <>
      <TaskReferenceMediaDisplay
        reference_photo_url={task.reference_photo_url}
        reference_video_url={task.reference_video_url}
        reference_audio_url={task.reference_audio_url}
      />
      {capture ? (
        <EmployeeCaptureSteps
          requirements={requirements}
          slots={capture.slots}
          onChange={capture.onSlotsChange}
          disabled={capture.saving}
          language={language}
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

/** Note et fichiers en plus : repliés, pour ne pas encombrer l'écran. */
function OptionalSections({ capture }: { capture: EmployeeTaskCaptureProps }) {
  const extras = capture.extras ?? [];
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <CollapsibleSection label={he.captureNoteToggle} defaultOpen={Boolean(capture.note.trim())}>
        <TextField
          label={he.note}
          value={capture.note}
          onChange={(e) => capture.onNoteChange(e.target.value)}
          fullWidth
          multiline
          minRows={3}
          placeholder={he.completionMediaHint}
          sx={employeeFieldSx}
        />
      </CollapsibleSection>
      <CollapsibleSection label={he.captureExtrasToggle} defaultOpen={extras.length > 0}>
        <ExtraCompletionMedia
          extras={extras}
          onChange={capture.onExtrasChange ?? (() => undefined)}
          disabled={capture.saving}
          onAnnotatingChange={capture.onAnnotatingChange}
        />
      </CollapsibleSection>
    </Box>
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
