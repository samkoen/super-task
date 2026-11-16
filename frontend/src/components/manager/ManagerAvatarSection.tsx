import { useState } from "react";
import { Avatar, Box, Button, Paper, Typography } from "@mui/material";
import EmployeeAvatarCapture from "../employee/EmployeeAvatarCapture";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { ApiError } from "../../services/api";
import { authService } from "../../services/authService";
import { he } from "../../i18n/he";

/**
 * Photo du menahel (stylisée « סופר-מן »), sortie de l'accueil vers « החשבון שלי » :
 * même capture et mêmes appels qu'avant.
 */
export default function ManagerAvatarSection() {
  const { user, refresh } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const media = useResolvedMediaSrc(user?.avatar_url || null, false);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setUploading(true);
    try {
      await action();
      await refresh();
      showSuccess(success);
      setOpen(false);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Paper variant="outlined" data-testid="manager-avatar-section" sx={{ p: { xs: 2, sm: 3 }, mb: 3, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700} mb={2}>{he.managerHomeAvatarTitle}</Typography>
      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
        <Avatar src={media.src ?? undefined} alt={user?.full_name || ""} sx={{ width: 72, height: 72 }}>
          {(user?.full_name || "").trim().charAt(0)}
        </Avatar>
        <Button variant="contained" onClick={() => setOpen(true)} disabled={uploading}>{he.employeeChangePhoto}</Button>
        {user?.avatar_url ? (
          <Button variant="text" color="inherit" disabled={uploading} onClick={() => void run(() => authService.deleteAvatar(), he.employeePhotoDeleted)}>
            {he.employeeDeletePhoto}
          </Button>
        ) : null}
      </Box>
      <EmployeeAvatarCapture
        open={open}
        uploading={uploading}
        uploadingLabel={he.avatarStylizing}
        onClose={() => setOpen(false)}
        onCapture={(file) => run(() => authService.stylizeAvatar(file), he.employeePhotoStylized)}
      />
    </Paper>
  );
}
