import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { WHATSAPP_TEXT_KEYS, type WhatsAppTextKey } from "../../domain/whatsappTexts";
import { he } from "../../i18n/he";
import { ApiError, type User } from "../../services/api";
import { whatsappService, type WhatsAppStatus } from "../../services/whatsappService";

interface Props {
  open: boolean;
  /** Employé de la base ; null = numéro extérieur saisi à la main. */
  employee: User | null;
  onClose: () => void;
  onSent: (status: WhatsAppStatus) => void;
}

export function canSubmitWhatsApp(args: {
  employee: User | null;
  name: string;
  phone: string;
  consent: boolean;
}): boolean {
  if (!args.consent) return false;
  if (args.employee) return Boolean(args.employee.phone?.trim());
  return Boolean(args.name.trim() && args.phone.trim());
}

export default function WhatsAppSendDialog({ open, employee, onClose, onSent }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [textKey, setTextKey] = useState<WhatsAppTextKey>(WHATSAPP_TEXT_KEYS[0]);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setPhone("");
    setTextKey(WHATSAPP_TEXT_KEYS[0]);
    setConsent(false);
    setError("");
  }, [open, employee?.id]);

  const handleSend = async () => {
    setSending(true);
    setError("");
    try {
      const message = await whatsappService.send(
        employee
          ? { recipientUserId: employee.id, textKey, consentConfirmed: consent }
          : { phone, recipientName: name, textKey, consentConfirmed: consent },
      );
      onSent(message.status);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSending(false);
    }
  };

  const noPhone = Boolean(employee) && !employee?.phone?.trim();

  return (
    <Dialog open={open} onClose={sending ? undefined : onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{employee ? `${he.whatsappSend} — ${employee.full_name}` : he.whatsappSendExternal}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {!employee && (
          <>
            <TextField label={he.whatsappRecipientName} value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
            <TextField
              label={he.whatsappPhone}
              helperText={he.whatsappPhoneHint}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              fullWidth
              required
              dir="ltr"
            />
          </>
        )}
        {employee && !noPhone && (
          <Typography variant="body2" color="text.secondary" dir="ltr" textAlign="right">
            {employee.phone}
          </Typography>
        )}
        {noPhone && <Alert severity="warning">{he.whatsappEmployeeNoPhone}</Alert>}
        <TextField select label={he.whatsappMessage} value={textKey} onChange={(e) => setTextKey(e.target.value as WhatsAppTextKey)} fullWidth>
          {WHATSAPP_TEXT_KEYS.map((key) => (
            <MenuItem key={key} value={key}>{he.whatsappTexts[key]}</MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
          label={he.whatsappConsent}
        />
        <Typography variant="caption" color="text.secondary">{he.whatsappSenderNote}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={onClose} disabled={sending}>{he.cancel}</Button>
        <Button
          variant="contained"
          onClick={() => void handleSend()}
          disabled={sending || !canSubmitWhatsApp({ employee, name, phone, consent })}
        >
          {sending ? <CircularProgress size={22} color="inherit" /> : he.whatsappSend}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
