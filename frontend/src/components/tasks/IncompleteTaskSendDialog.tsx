import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AppDialogTitle from "../ui/AppDialogTitle";
import { he } from "../../i18n/he";
import { incompleteReasonError } from "../../utils/employeeIncompleteSubmit";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeeBigButtonSx, employeeFieldSx } from "../../styles/employeeUi";

type IncompleteTaskSendDialogProps = {
  open: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

/** L'oved n'a pas fini : message clair + explication obligatoire. */
export default function IncompleteTaskSendDialog({
  open,
  saving = false,
  onClose,
  onConfirm,
}: IncompleteTaskSendDialogProps) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) return;
    setReason("");
    setError("");
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    setReason("");
    setError("");
    onClose();
  };

  const handleConfirm = () => {
    const err = incompleteReasonError(reason);
    if (err) {
      setError(err);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth fullScreen={fullScreen} maxWidth="sm" dir="rtl">
      <AppDialogTitle title={he.incompleteTaskTitle} onClose={handleClose} closeDisabled={saving} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Alert severity="warning" sx={{ borderRadius: "14px", fontSize: "1rem", fontWeight: 600 }}>
          {he.incompleteTaskBody}
        </Alert>
        <TextField
          label={he.incompleteTaskReasonLabel}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError("");
          }}
          placeholder={he.incompleteTaskReasonHint}
          fullWidth
          multiline
          minRows={3}
          disabled={saving}
          error={Boolean(error)}
          helperText={error || he.incompleteTaskReasonHint}
          sx={employeeFieldSx}
        />
      </DialogContent>
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={handleClose} disabled={saving} sx={dialogSecondaryActionSx}>
          {he.cancel}
        </Button>
        <Button
          variant="contained"
          color="warning"
          onClick={handleConfirm}
          disabled={saving}
          sx={employeeBigButtonSx}
        >
          {he.incompleteTaskSendAnyway}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
