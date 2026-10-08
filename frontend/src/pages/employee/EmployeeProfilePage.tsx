import { useEffect, useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { ApiError } from "../../services/api";
import { authService } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import EmployeeAvatarCapture from "../../components/employee/EmployeeAvatarCapture";
import { he } from "../../i18n/he";
import { EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";
import { employeeProfileFormFromUser, type EmployeeProfileForm } from "./employeeProfileForm";
import {
  ProfileDetailsCard,
  ProfileHero,
  ProfilePasswordCard,
  type PasswordFormValue,
} from "./EmployeeProfileSections";
import AppUpdateCard from "../../components/appUpdate/AppUpdateCard";

const EMPTY_PASSWORD: PasswordFormValue = {
  current_password: "",
  new_password: "",
  confirm_password: "",
};

const EMPTY_FORM: EmployeeProfileForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  preferred_language: "he",
};

function useAvatarActions(refresh: () => Promise<unknown> | void) {
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const run = async (action: () => Promise<void>, onOk?: () => void) => {
    setUploading(true);
    try {
      await action();
      await refresh();
      onOk?.();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setUploading(false);
    }
  };

  const capture = (file: File) =>
    run(
      async () => {
        await authService.stylizeAvatar(file);
      },
      () => {
        showSuccess(he.employeePhotoStylized);
        setOpen(false);
      },
    );

  const remove = () =>
    run(
      async () => {
        await authService.deleteAvatar();
      },
      () => showSuccess(he.employeePhotoDeleted),
    );

  return { open, setOpen, uploading, capture, remove };
}

export default function EmployeeProfilePage() {
  const { user, refresh, logout } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EmployeeProfileForm>(EMPTY_FORM);
  const [passwordForm, setPasswordForm] = useState<PasswordFormValue>(EMPTY_PASSWORD);
  const [savingPassword, setSavingPassword] = useState(false);
  const avatar = useAvatarActions(refresh);

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
      setPasswordForm(EMPTY_PASSWORD);
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
    <Box sx={{ maxWidth: 560, mx: "auto", display: "flex", flexDirection: "column", gap: 2.5 }}>
      <ProfileHero
        name={user.full_name}
        photoUrl={user.avatar_url}
        slogan={user.excellence_slogan}
        onEditPhoto={() => avatar.setOpen(true)}
        onDeletePhoto={user.avatar_url ? () => void avatar.remove() : undefined}
      />
      <ProfileDetailsCard
        form={form}
        saving={saving}
        onChange={setForm}
        onSave={() => void handleSaveProfile()}
      />
      <ProfilePasswordCard
        value={passwordForm}
        saving={savingPassword}
        onChange={setPasswordForm}
        onSave={() => void handleChangePassword()}
      />
      <AppUpdateCard layoutSx={{ mt: 0 }} />
      <Button
        variant="outlined"
        color="error"
        startIcon={<LogoutRoundedIcon />}
        onClick={() => void logout()}
        sx={{ minHeight: EMPLOYEE_TOUCH_MIN, borderRadius: "16px", fontWeight: 800, fontSize: "1.05rem" }}
      >
        {he.logout}
      </Button>
      <EmployeeAvatarCapture
        open={avatar.open}
        uploading={avatar.uploading}
        uploadingLabel={he.avatarStylizing}
        onClose={() => avatar.setOpen(false)}
        onCapture={avatar.capture}
      />
    </Box>
  );
}
