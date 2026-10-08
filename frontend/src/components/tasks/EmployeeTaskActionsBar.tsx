import { Box, Button, DialogActions, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import EmployeeDoTaskButton from "./EmployeeDoTaskButton";
import { he } from "../../i18n/he";
import { EMPLOYEE_INK } from "../../styles/employeeUi";
import { captureProgress } from "../../utils/captureProgress";
import { canDoTask } from "../../utils/employeeDoTask";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";
import type { TaskStatus } from "../../services/taskService";

export type EmployeeActionsCapture = {
  slots: Array<PendingMedia | null>;
  onSubmit: () => void;
  canSubmit: boolean;
  slotsFilled?: boolean;
  saving: boolean;
};

/** Phrase d'état au-dessus du bouton : ce qu'il reste à faire, ou « tout est prêt ». */
export function ReadinessLine({
  requirements,
  slots,
  slotsFilled,
}: {
  requirements: CompletionRequirement[];
  slots: Array<PendingMedia | null>;
  slotsFilled?: boolean;
}) {
  const progress = captureProgress(requirements, slots);
  const ready = slotsFilled !== false && progress.remaining === 0;
  if (!requirements.length && slotsFilled !== false) return null;
  return (
    <Box data-testid="readiness-line" data-ready={ready} sx={{ textAlign: "center" }}>
      {ready || progress.remaining > 0 ? (
        <Typography sx={{ fontWeight: 800, color: ready ? "success.main" : "text.primary" }}>
          {ready ? he.captureAllReady : he.captureRemaining(progress.remaining)}
        </Typography>
      ) : null}
      {slotsFilled === false ? (
        <Typography variant="caption" color="warning.main">
          {he.completionFillSlotsHint}
        </Typography>
      ) : null}
    </Box>
  );
}

function PrimaryAction({
  status,
  capture,
  onDoTask,
  starting,
}: {
  status: TaskStatus;
  capture?: EmployeeActionsCapture;
  onDoTask?: () => void;
  starting: boolean;
}) {
  if (capture) {
    return (
      <EmployeeDoTaskButton
        prominent
        status={status}
        starting={capture.saving}
        disabled={!capture.canSubmit}
        onClick={capture.onSubmit}
      />
    );
  }
  if (onDoTask) {
    return <EmployeeDoTaskButton prominent status={status} starting={starting} onClick={onDoTask} />;
  }
  return null;
}

/** Barre fixe du bas : état d'avancement + un seul gros bouton. */
export default function EmployeeTaskActionsBar({
  status,
  requirements,
  capture,
  onClose,
  onDoTask,
  starting,
}: {
  status: TaskStatus;
  requirements: CompletionRequirement[];
  capture?: EmployeeActionsCapture;
  onClose: () => void;
  onDoTask?: () => void;
  starting: boolean;
}) {
  const primary = <PrimaryAction status={status} capture={capture} onDoTask={onDoTask} starting={starting} />;
  const hasPrimary = Boolean(capture || onDoTask) && canDoTask(status);
  return (
    <DialogActions
      sx={{
        px: { xs: 2, sm: 3 },
        pt: 1.5,
        pb: dialogActionsPbCss(),
        flexDirection: "column",
        alignItems: "stretch",
        gap: 1,
        flexShrink: 0,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        boxShadow: `0 -6px 18px ${alpha(EMPLOYEE_INK, 0.06)}`,
        "& > :not(style) ~ :not(style)": { marginLeft: 0 },
      }}
    >
      {capture ? (
        <ReadinessLine requirements={requirements} slots={capture.slots} slotsFilled={capture.slotsFilled} />
      ) : null}
      {primary}
      {hasPrimary ? null : (
        <Button onClick={onClose} sx={{ minHeight: 52, fontSize: "1.05rem", fontWeight: 700 }}>
          {he.close}
        </Button>
      )}
    </DialogActions>
  );
}
