import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { he } from "../../i18n/he";
import { incompleteReasonError } from "../../utils/employeeIncompleteSubmit";
import { dialogActionsPbCss } from "../../utils/systemInsets";

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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.incompleteTaskTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <Alert severity="warning">{he.incompleteTaskBody}</Alert>
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
          minRows={2}
          disabled={saving}
          error={Boolean(error)}
          helperText={error || he.incompleteTaskReasonHint}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>
          {he.cancel}
        </Button>
        <Button variant="contained" color="warning" onClick={handleConfirm} disabled={saving}>
          {he.incompleteTaskSendAnyway}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
