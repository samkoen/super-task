import { useEffect, useState } from "react";
import { Box, Button, Checkbox, CircularProgress, FormControlLabel, Paper, TextField, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import AgrolineNotesDialog from "./AgrolineNotesDialog";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";

type Account = Awaited<ReturnType<typeof deliveryNoteService.account>>;

export default function AgrolineConnectionCard() {
  const { showError, showSuccess } = useFeedback();
  const [account, setAccount] = useState<Account | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    deliveryNoteService.account().then(applyAccount(setAccount, setEnabled, setUsername, setInternal)).catch(() => undefined);
  }, []);

  const save = () => void storeAccount(
    { enabled, username, password, internal },
    setBusy,
    setAccount,
    setPassword,
    showSuccess,
    showError,
  );
  const sync = () => void runSync(setBusy, setSyncing, showSuccess, showError);

  if (!account) return null;
  return (
    <AccessPanel
      account={account}
      enabled={enabled}
      username={username}
      password={password}
      internal={internal}
      busy={busy}
      syncing={syncing}
      notesOpen={notesOpen}
      onEnabled={setEnabled}
      onUsername={setUsername}
      onPassword={setPassword}
      onInternal={setInternal}
      onSave={save}
      onSync={sync}
      onNotes={setNotesOpen}
    />
  );
}

function AccessPanel(props: {
  account: Account;
  enabled: boolean;
  username: string;
  password: string;
  internal: boolean;
  busy: boolean;
  syncing: boolean;
  notesOpen: boolean;
  onEnabled: (value: boolean) => void;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onInternal: (value: boolean) => void;
  onSave: () => void;
  onSync: () => void;
  onNotes: (open: boolean) => void;
}) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700} mb={1}>{he.agrolineAccountTitle}</Typography>
      <FormControlLabel
        control={<Checkbox checked={props.enabled} onChange={(event) => props.onEnabled(event.target.checked)} />}
        label={he.agrolineAccess}
      />
      {props.enabled ? <AccountFields {...props} configured={props.account.configured} /> : null}
      <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
        <Button variant="outlined" disabled={props.busy || (props.enabled && !props.username.trim())} onClick={props.onSave}>
          {he.agrolineSaveAccount}
        </Button>
        {props.account.enabled && props.account.configured ? (
          <SyncActions busy={props.busy} syncing={props.syncing} onSync={props.onSync} onOpen={() => props.onNotes(true)} />
        ) : null}
      </Box>
      <AgrolineNotesDialog open={props.notesOpen} onClose={() => props.onNotes(false)} />
    </Paper>
  );
}

function applyAccount(
  setAccount: (account: Account) => void,
  setEnabled: (value: boolean) => void,
  setUsername: (value: string) => void,
  setInternal: (value: boolean) => void,
) {
  return (status: Account) => {
    setAccount(status);
    setEnabled(status.enabled);
    setUsername(status.username || "");
    setInternal(Boolean(status.internal));
  };
}

function AccountFields({
  username,
  password,
  internal,
  configured,
  onUsername,
  onPassword,
  onInternal,
}: {
  username: string;
  password: string;
  internal: boolean;
  configured: boolean;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onInternal: (value: boolean) => void;
}) {
  return (
    <Box display="flex" flexDirection="column" gap={2} mt={1}>
      <TextField label={he.agrolineUsername} value={username} onChange={(event) => onUsername(event.target.value)} fullWidth size="small" />
      <TextField
        label={he.agrolinePassword}
        type="password"
        value={password}
        onChange={(event) => onPassword(event.target.value)}
        placeholder={configured ? he.agrolinePasswordKept : ""}
        fullWidth
        size="small"
      />
      <FormControlLabel
        control={<Checkbox checked={internal} onChange={(event) => onInternal(event.target.checked)} />}
        label={he.agrolineInternal}
      />
    </Box>
  );
}

function SyncActions({
  busy,
  syncing,
  onSync,
  onOpen,
}: {
  busy: boolean;
  syncing: boolean;
  onSync: () => void;
  onOpen: () => void;
}) {
  return (
    <>
      <Button
        variant="contained"
        disabled={busy}
        onClick={onSync}
        startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : undefined}
      >
        {he.agrolineSync}
      </Button>
      <Button variant="text" disabled={busy} onClick={onOpen}>{he.agrolineViewNotes}</Button>
    </>
  );
}

async function storeAccount(
  fields: { enabled: boolean; username: string; password: string; internal: boolean },
  setBusy: (value: boolean) => void,
  setAccount: (account: Account) => void,
  setPassword: (value: string) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
) {
  setBusy(true);
  try {
    const saved = await deliveryNoteService.saveAccount(fields);
    setAccount(saved);
    setPassword("");
    showSuccess(he.agrolineAccountSaved);
  } catch (error) {
    showError(error instanceof ApiError ? error.message : he.errorGeneric);
  } finally {
    setBusy(false);
  }
}

async function runSync(
  setBusy: (value: boolean) => void,
  setSyncing: (value: boolean) => void,
  showSuccess: (message: string) => void,
  showError: (message: string) => void,
) {
  setBusy(true);
  setSyncing(true);
  try {
    const outcome = await deliveryNoteService.syncToday();
    showSuccess(`${outcome.results.length} ${he.agrolineNotesRead}`);
    if (outcome.errors[0]) showError(outcome.errors[0].error);
  } catch (error) {
    showError(error instanceof ApiError ? error.message : he.errorGeneric);
  } finally {
    setBusy(false);
    setSyncing(false);
  }
}
