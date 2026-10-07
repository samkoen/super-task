import { useEffect, useState } from "react";
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Paper, TextField, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import AgrolineInbox from "./AgrolineInbox";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";

function SyncButton({
  disabled,
  spinning,
  onClick,
}: {
  disabled: boolean;
  spinning: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="contained"
      disabled={disabled}
      onClick={onClick}
      startIcon={spinning ? <CircularProgress size={16} color="inherit" /> : undefined}
    >
      {he.agrolineSync}
    </Button>
  );
}

export default function AgrolineConnectionCard() {
  const { showError, showSuccess } = useFeedback();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [internal, setInternal] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [inboxKey, setInboxKey] = useState(0);

  useEffect(() => {
    deliveryNoteService.account().then((status) => {
      setConfigured(status.configured);
      setUsername(status.username || "");
      setInternal(Boolean(status.internal));
    }).catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy(true);
    try {
      const saved = await deliveryNoteService.saveAccount({ username, password, internal });
      setConfigured(saved.configured);
      setPassword("");
      showSuccess(he.agrolineAccountSaved);
    } catch (error) {
      showError(error instanceof ApiError ? error.message : he.errorGeneric);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setSyncing(true);
    try {
      const outcome = await deliveryNoteService.syncToday();
      showSuccess(`${he.agrolineSyncDone} (${outcome.results.length})`);
      setInboxKey((key) => key + 1);
      if (outcome.errors[0]) showError(outcome.errors[0].error);
    } catch (error) {
      showError(error instanceof ApiError ? error.message : he.errorGeneric);
    } finally {
      setBusy(false);
      setSyncing(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>{he.agrolineAccountTitle}</Typography>
      <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
        <TextField label={he.agrolineUsername} value={username} onChange={(e) => setUsername(e.target.value)} size="small" />
        <TextField
          label={he.agrolinePassword}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={configured ? he.agrolinePasswordKept : ""}
          size="small"
        />
        <FormControlLabel
          control={<Checkbox checked={internal} onChange={(e) => setInternal(e.target.checked)} />}
          label={he.agrolineInternal}
        />
        <Button variant="outlined" disabled={busy || !username.trim()} onClick={() => void save()}>
          {he.agrolineSaveAccount}
        </Button>
        <SyncButton disabled={busy || !configured} spinning={syncing} onClick={() => void sync()} />
      </Box>
      <AgrolineInbox reloadKey={inboxKey} />
    </Paper>
  );
}
