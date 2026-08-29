import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { employeeActivityService } from "../../services/employeeActivityService";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import { formatBreakElapsed, type BreakAlertTarget } from "../../utils/breakAlert";

export default function BreakAlertDialog({
  target,
  onClose,
}: {
  target: BreakAlertTarget | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => setError(""), [target]);

  return (
    <Dialog open={Boolean(target)} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.breakAlertTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.25, pt: 1 }}>
        {target ? <BreakAlertCopy alert={target.alert} /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
      </DialogContent>
      <BreakAlertActions
        busy={busy}
        onKeepSilent={onClose}
        onRing={() => void ringAnyway(target, onClose, setBusy, setError)}
      />
    </Dialog>
  );
}

function BreakAlertCopy({ alert }: { alert: BreakAlertTarget["alert"] }) {
  return (
    <>
      <Typography>{he.breakAlertSince(formatTime(alert.on_break_since))}</Typography>
      <Typography>{he.breakAlertElapsed(formatBreakElapsed(alert.elapsed_seconds))}</Typography>
      <Typography fontWeight={700}>{he.breakAlertQuestion}</Typography>
    </>
  );
}

function BreakAlertActions({
  busy,
  onKeepSilent,
  onRing,
}: {
  busy: boolean;
  onKeepSilent: () => void;
  onRing: () => void;
}) {
  return (
    <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
      <Button onClick={onKeepSilent} disabled={busy}>{he.breakAlertKeepSilent}</Button>
      <Button
        variant="contained"
        color="warning"
        onClick={onRing}
        disabled={busy}
        startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {he.breakAlertRingAnyway}
      </Button>
    </DialogActions>
  );
}

async function ringAnyway(
  target: BreakAlertTarget | null,
  onClose: () => void,
  setBusy: (v: boolean) => void,
  setError: (v: string) => void,
) {
  if (!target) return;
  setBusy(true);
  setError("");
  try {
    await employeeActivityService.ring(target.userId);
    onClose();
  } catch (e) {
    setError(e instanceof ApiError ? e.message : he.errorGeneric);
  } finally {
    setBusy(false);
  }
}
