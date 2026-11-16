import { useEffect, useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import { useFeedback } from "../../../context/FeedbackContext";
import type { EmployeeAccounts } from "../../../hooks/useEmployeeAccounts";
import { he } from "../../../i18n/he";
import { flowColor, flowText } from "../../../styles/flowTokens";
import { studioFieldSx } from "../../tasks/fixed/studio/studioUi";

/** Confirmation avant d'ouvrir ou de couper l'accès à l'application. */
export function EmployeeAccessDialog({ accounts }: { accounts: EmployeeAccounts }) {
  const target = accounts.access;
  const revoke = Boolean(target?.is_active);
  return (
    <Dialog open={Boolean(target)} onClose={accounts.closeAccess} dir="rtl">
      <DialogTitle>{revoke ? he.revokeAppAccess : he.grantAppAccess}</DialogTitle>
      <DialogContent>
        <Typography>{revoke ? he.confirmRevokeAppAccess : he.confirmGrantAppAccess}</Typography>
        {target ? <Typography fontWeight={600} mt={1}>{target.full_name}</Typography> : null}
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={accounts.closeAccess} disabled={accounts.saving}>{he.cancel}</Button>
        <Button data-testid="employee-access-confirm" variant="contained" color={revoke ? "warning" : "success"} onClick={() => void accounts.toggleAccess()} disabled={accounts.saving}>
          {revoke ? he.revokeAppAccess : he.grantAppAccess}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Nouveau mot de passe choisi par le menahel (deux fois, pour éviter une faute de frappe). */
export function EmployeePasswordDialog({ accounts }: { accounts: EmployeeAccounts }) {
  const { showError } = useFeedback();
  const target = accounts.password;
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  useEffect(() => { setValue(""); setConfirm(""); }, [target]);
  const submit = () => {
    if (value !== confirm) { showError(he.passwordMismatch); return; }
    void accounts.resetPassword(value);
  };
  return (
    <Dialog open={Boolean(target)} onClose={accounts.closePassword} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{he.resetEmployeePassword}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {target ? <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{target.full_name}</Typography> : null}
        <TextField label={he.newPassword} type="password" value={value} onChange={(e) => setValue(e.target.value)} required fullWidth dir="ltr" sx={studioFieldSx} />
        <TextField label={he.confirmPassword} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required fullWidth dir="ltr" sx={studioFieldSx} />
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={accounts.closePassword} disabled={accounts.saving}>{he.cancel}</Button>
        <Button data-testid="employee-password-submit" variant="contained" onClick={submit} disabled={accounts.saving}>
          {accounts.saving ? <CircularProgress size={22} color="inherit" /> : he.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
