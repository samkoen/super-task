import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import PageHeader from "../../components/ui/PageHeader";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";
import EmployeeAvatarCapture from "../../components/employee/EmployeeAvatarCapture";
import { EMPLOYEE_LANGUAGES, EMPLOYEE_LANGUAGE_LABELS } from "../../domain/employeeLanguages";
import type { EmployeeLanguage } from "../../domain/employeeLanguages";
import { he } from "../../i18n/he";
import { employeeProfileFormFromUser, type EmployeeProfileForm } from "./employeeProfileForm";

export default function EmployeeProfilePage() {
  const { user, refresh } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState<EmployeeProfileForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    preferred_language: "he",
  });
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (user) setForm(employeeProfileFormFromUser(user));
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await authService.updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone || undefined,
        preferred_language: form.preferred_language,
      });
      await refresh();
      showSuccess(res.message || he.profileUpdated);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarCapture = async (file: File) => {
    setAvatarUploading(true);
    try {
      await authService.stylizeAvatar(file);
      await refresh();
      showSuccess(he.employeePhotoStylized);
      setAvatarOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    try {
      await authService.deleteAvatar();
      await refresh();
      showSuccess(he.employeePhotoDeleted);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setAvatarUploading(false);
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
        passwordForm.new_password,
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
      <PageHeader title={he.myAccount} subtitle={he.employeeAccountSubtitle} />
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <EmployeeAvatar
            name={user.full_name}
            photoUrl={user.avatar_url}
            size={112}
            editable
            onEdit={() => setAvatarOpen(true)}
            onDelete={user.avatar_url ? () => void handleAvatarDelete() : undefined}
          />
          <Box>
            <Typography variant="body2" color="text.secondary">
              {he.avatarCropHint}
            </Typography>
            {user.excellence_slogan ? (
              <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mt: 0.5 }}>
                {user.excellence_slogan}
              </Typography>
            ) : null}
          </Box>
        </Box>
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
            select
            label={he.myLanguage}
            value={form.preferred_language}
            onChange={(e) =>
              setForm({ ...form, preferred_language: e.target.value as EmployeeLanguage })
            }
            required
            fullWidth
          >
            {EMPLOYEE_LANGUAGES.map((lang) => (
              <MenuItem key={lang} value={lang}>
                {EMPLOYEE_LANGUAGE_LABELS[lang]}
              </MenuItem>
            ))}
          </TextField>
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
              disabled={saving}
            >
              {saving ? <CircularProgress size={22} color="inherit" /> : he.saveProfile}
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
              {savingPassword ? <CircularProgress size={22} color="inherit" /> : he.changePassword}
            </Button>
          </Box>
        </Box>
      </Paper>

      <EmployeeAvatarCapture
        open={avatarOpen}
        uploading={avatarUploading}
        uploadingLabel={he.avatarStylizing}
        onClose={() => setAvatarOpen(false)}
        onCapture={handleAvatarCapture}
      />
    </Box>
  );
}
