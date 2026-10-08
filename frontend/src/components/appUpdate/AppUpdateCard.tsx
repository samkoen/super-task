import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { he } from "../../i18n/he";
import { useAppUpdate } from "../../hooks/useAppUpdate";
import { employeeCardSx, employeePrimaryButtonSx } from "../../styles/employeeUi";

const DEFAULT_LAYOUT = { mt: 3, maxWidth: 560 } as const;

interface AppUpdateCardProps {
  /** Surcharge de mise en page (marge, largeur) selon l'écran hôte. */
  layoutSx?: SxProps<Theme>;
}

export default function AppUpdateCard({ layoutSx = DEFAULT_LAYOUT }: AppUpdateCardProps) {
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
    <Paper
      variant="outlined"
      sx={[employeeCardSx, { p: { xs: 2.5, sm: 3 } }, ...(Array.isArray(layoutSx) ? layoutSx : [layoutSx])]}
    >
      <Typography variant="h6" component="h2" fontWeight={800} mb={1}>
        {he.appUpdateTitle}
      </Typography>
      {loading ? (
        <CircularProgress size={22} />
      ) : (
        <Box display="flex" flexDirection="column" gap={1.5}>
          <Typography variant="body1" color="text.secondary">
            {he.appUpdateCurrent}: {installed?.versionName || "—"}
          </Typography>
          {latest?.available ? (
            <Typography variant="body1" color="text.secondary">
              {he.appUpdateLatest}: {latest.version_name}
            </Typography>
          ) : null}
          {updateAvailable ? (
            <Button
              variant="contained"
              onClick={() => void downloadLatest()}
              disabled={downloading}
              sx={employeePrimaryButtonSx}
            >
              {downloading ? <CircularProgress size={24} color="inherit" /> : he.appUpdateDownload}
            </Button>
          ) : (
            <Typography variant="body1" fontWeight={700} color="primary">
              {he.appUpdateUpToDate}
            </Typography>
          )}
          {message ? <Alert severity="warning">{message}</Alert> : null}
        </Box>
      )}
    </Paper>
  );
}
