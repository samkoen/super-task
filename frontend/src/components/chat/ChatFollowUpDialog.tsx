import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { he } from "../../i18n/he";
import { datetimeLocalToIso, toDatetimeLocalValue } from "../../utils/chatTaskFollowUp";

export default function ChatFollowUpDialog({
  open,
  initialIso,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  initialIso?: string | null;
  saving: boolean;
  onClose: () => void;
  onSave: (iso: string) => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue(toDatetimeLocalValue(initialIso));
  }, [open, initialIso]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.chatTaskReminder}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {he.chatTaskReminderHint}
        </Typography>
        <TextField
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ "aria-label": he.chatTaskReminder }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onClose} disabled={saving}>{he.cancel}</Button>
        <Button
          variant="contained"
          disabled={saving || !datetimeLocalToIso(value)}
          onClick={() => {
            const iso = datetimeLocalToIso(value);
            if (iso) onSave(iso);
          }}
        >
          {he.chatTaskReminderSave}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
