import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from "@mui/material";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { EMPLOYEE_BRAND, employeeFieldSx, employeePrimaryButtonSx } from "../../styles/employeeUi";
import {
  datetimeLocalToIso,
  followUpPresets,
  formatFollowUpPreview,
  toDatetimeLocalValue,
} from "../../utils/chatTaskFollowUp";
import AppDialogTitle from "../ui/AppDialogTitle";
import QuickTimePresets from "../ui/QuickTimePresets";

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
  const presets = useMemo(() => (open ? followUpPresets(new Date()) : []), [open]);

  useEffect(() => {
    if (open) setValue(toDatetimeLocalValue(initialIso));
  }, [open, initialIso]);

  const iso = datetimeLocalToIso(value);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <AppDialogTitle title={he.chatTaskReminder} onClose={onClose} closeDisabled={saving} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <Typography color="text.secondary" sx={{ fontSize: "1rem" }}>
          {he.chatTaskReminderHint}
        </Typography>
        <QuickTimePresets presets={presets} selected={value} onPick={setValue} disabled={saving} />
        <TextField
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          fullWidth
          label={he.followUpOtherTime}
          InputLabelProps={{ shrink: true }}
          inputProps={{ "aria-label": he.chatTaskReminder }}
          sx={employeeFieldSx}
        />
        {iso ? (
          <Typography fontWeight={800} sx={{ color: EMPLOYEE_BRAND }} data-testid="follow-up-preview">
            {he.chatTaskFollowUpChip(formatFollowUpPreview(value))}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={onClose} disabled={saving} sx={dialogSecondaryActionSx}>{he.cancel}</Button>
        <Button
          variant="contained"
          disabled={saving || !iso}
          onClick={() => iso && onSave(iso)}
          sx={employeePrimaryButtonSx}
        >
          {he.chatTaskReminderSave}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
