import { useEffect, useState } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import EditDialogFooterButtons from "./EditDialogFooterButtons";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";

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
      <EditDialogFooterButtons
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
      <DialogTitle sx={{ fontWeight: 800 }}>{he.fixedTaskUpdateAllBranches}</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
          {he.fixedTaskUpdateAllBranchesConfirm}
        </Typography>
      </DialogContent>
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={onCancel} disabled={submitting} sx={dialogSecondaryActionSx}>
          {he.cancel}
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={submitting} sx={employeePrimaryButtonSx}>
          {submitting ? <CircularProgress size={24} color="inherit" /> : he.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
