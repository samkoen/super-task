import { useEffect, useState } from "react";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import { employeeActivityService } from "../../services/employeeActivityService";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";
import { formatTime } from "../../utils/dashboardTime";
import { formatBreakElapsed, type BreakAlertTarget } from "../../utils/breakAlert";
import AppDialogTitle from "../ui/AppDialogTitle";

/**
 * Le salarié est en pause : le choix sûr (rester silencieux) est le gros bouton principal,
 * l'envoi avec sonnerie (urgence) est une action volontaire en dessous.
 */
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
      <AppDialogTitle title={he.breakAlertTitle} onClose={onClose} closeDisabled={busy} />
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
      <Typography sx={{ fontSize: "1.05rem" }}>{he.breakAlertSince(formatTime(alert.on_break_since))}</Typography>
      <Typography sx={{ fontSize: "1.05rem" }}>
        {he.breakAlertElapsed(formatBreakElapsed(alert.elapsed_seconds))}
      </Typography>
      <Typography fontWeight={800} sx={{ fontSize: "1.05rem" }}>{he.breakAlertQuestion}</Typography>
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
    <DialogActions sx={dialogStackedActionsSx}>
      <Button
        variant="outlined"
        color="warning"
        onClick={onRing}
        disabled={busy}
        sx={dialogSecondaryActionSx}
      >
        {busy ? <CircularProgress size={22} color="inherit" /> : he.breakAlertRingAnyway}
      </Button>
      <Button variant="contained" onClick={onKeepSilent} disabled={busy} sx={employeePrimaryButtonSx}>
        {he.breakAlertKeepSilent}
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
