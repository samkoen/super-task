import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { he } from "../../i18n/he";

export default function ClosedTaskReopenConfirm({
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={saving ? undefined : onCancel} dir="rtl">
      <DialogTitle>{he.taskReopenClosedConfirmTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2">{he.taskReopenClosedConfirm}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={saving}>
          {he.cancel}
        </Button>
        <Button variant="contained" color="warning" onClick={onConfirm} disabled={saving}>
          {he.taskReopenClosed}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
