import { useEffect, useState } from "react";
import {
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EditDialogFooterIcons from "./EditDialogFooterIcons";
import { he } from "../../i18n/he";

const confirmButtonSx = {
  bgcolor: "primary.main",
  color: "primary.contrastText",
  "&:hover": { bgcolor: "primary.dark" },
  "&.Mui-disabled": {
    bgcolor: "action.disabledBackground",
    color: "action.disabled",
  },
};

export function networkSaveNeedsConfirm(applyToNetwork: boolean): boolean {
  return applyToNetwork;
}

type EditDialogSaveActionsProps = {
  applyToNetwork: boolean;
  resetKey?: string;
  onCancel: () => void;
  onSave: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  submitting?: boolean;
};

export default function EditDialogSaveActions({
  applyToNetwork,
  resetKey,
  onCancel,
  onSave,
  disabled = false,
  submitDisabled = false,
  submitting = false,
}: EditDialogSaveActionsProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setConfirming(false);
  }, [resetKey, applyToNetwork]);

  return (
    <>
      <EditDialogFooterIcons
        onCancel={onCancel}
        onSubmit={() => {
          if (networkSaveNeedsConfirm(applyToNetwork)) setConfirming(true);
          else onSave();
        }}
        disabled={disabled || confirming}
        submitDisabled={submitDisabled}
        submitting={submitting}
      />
      <NetworkUpdateConfirmDialog
        open={confirming && applyToNetwork}
        onCancel={() => setConfirming(false)}
        onConfirm={onSave}
        submitting={submitting}
      />
    </>
  );
}

function NetworkUpdateConfirmDialog({
  open,
  onCancel,
  onConfirm,
  submitting,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  submitting: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => !submitting && onCancel()}
      fullWidth
      maxWidth="xs"
      dir="rtl"
      transitionDuration={0}
    >
      <DialogTitle>{he.fixedTaskUpdateAllBranches}</DialogTitle>
      <DialogContent>
        <Typography variant="body1">{he.fixedTaskUpdateAllBranchesConfirm}</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Tooltip title={he.cancel}>
          <span>
            <IconButton onClick={onCancel} disabled={submitting} aria-label={he.cancel}>
              <CloseIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={he.confirm}>
          <span>
            <IconButton
              color="primary"
              onClick={onConfirm}
              disabled={submitting}
              aria-label={he.confirm}
              sx={confirmButtonSx}
            >
              {submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            </IconButton>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}
