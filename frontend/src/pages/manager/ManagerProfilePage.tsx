import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import PageHeader from "../../components/ui/PageHeader";
import { he } from "../../i18n/he";
import ManagerNetworkChatSetting from "../../components/manager/ManagerNetworkChatSetting";

export default function ManagerProfilePage() {
  const { user, refresh } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone ?? "",
    });
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await authService.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
      });
      await refresh();
      showSuccess(res.message || he.profileUpdated);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showError(he.passwordMismatch);
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authService.changePassword(
        passwordForm.current_password,
        passwordForm.new_password
      );
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      showSuccess(res.message || he.passwordChanged);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader title={he.myAccount} subtitle={he.myAccountSubtitle} />
      {user.role === "network_manager" && <ManagerNetworkChatSetting />}

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
        <Typography variant="h6" fontWeight={700} mb={2}>
          {he.profileDetails}
        </Typography>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label={he.firstName}
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={he.lastName}
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label={he.loginIdentifier}
            helperText={he.loginIdentifierHint}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            fullWidth
            dir="ltr"
          />
          <TextField
            label={he.phone}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            fullWidth
            dir="ltr"
          />
          <Box>
            <Button
              variant="contained"
              onClick={() => void handleSaveProfile()}
              disabled={savingProfile}
            >
              {savingProfile ? <CircularProgress size={22} color="inherit" /> : he.saveProfile}
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 560 }}>
        <Typography variant="h6" fontWeight={700} mb={1}>
          {he.changePassword}
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          {he.changePasswordHint}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            label={he.currentPassword}
            type="password"
            value={passwordForm.current_password}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, current_password: e.target.value })
            }
            required
            fullWidth
            dir="ltr"
          />
          <TextField
            label={he.newPassword}
            type="password"
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
            required
            fullWidth
            dir="ltr"
          />
          <TextField
            label={he.confirmPassword}
            type="password"
            value={passwordForm.confirm_password}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, confirm_password: e.target.value })
            }
            required
            fullWidth
            dir="ltr"
          />
          {!passwordForm.new_password ||
          passwordForm.new_password === passwordForm.confirm_password ? null : (
            <Alert severity="warning">{he.passwordMismatch}</Alert>
          )}
          <Box>
            <Button
              variant="contained"
              onClick={() => void handleChangePassword()}
              disabled={savingPassword}
            >
              {savingPassword ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                he.changePassword
              )}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
