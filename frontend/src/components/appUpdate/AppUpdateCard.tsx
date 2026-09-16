import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { useAppUpdate } from "../../hooks/useAppUpdate";

export default function AppUpdateCard() {
  const {
    enabled,
    installed,
    latest,
    loading,
    downloading,
    message,
    updateAvailable,
    downloadLatest,
  } = useAppUpdate();

  if (!enabled) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mt: 3, maxWidth: 560 }}>
      <Typography variant="h6" fontWeight={700} mb={1}>
        {he.appUpdateTitle}
      </Typography>
      {loading ? (
        <CircularProgress size={22} />
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Typography variant="body2" color="text.secondary">
            {he.appUpdateCurrent}: {installed?.versionName || "—"}
          </Typography>
          {latest?.available ? (
            <Typography variant="body2" color="text.secondary">
              {he.appUpdateLatest}: {latest.version_name}
            </Typography>
          ) : null}
          {updateAvailable ? (
            <Button variant="contained" onClick={() => void downloadLatest()} disabled={downloading}>
              {downloading ? <CircularProgress size={22} color="inherit" /> : he.appUpdateDownload}
            </Button>
          ) : (
            <Typography variant="body2">{he.appUpdateUpToDate}</Typography>
          )}
          {message ? <Alert severity="warning">{message}</Alert> : null}
        </Box>
      )}
    </Paper>
  );
}
