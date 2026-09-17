import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { he } from "../../i18n/he";
import { fillVersionPlaceholders } from "../../utils/appRelease";
import { dialogActionsPbCss } from "../../utils/systemInsets";

export type AppUpdateDialogProps = {
  open: boolean;
  currentName: string;
  latestName: string;
  downloading: boolean;
  message: string;
  onDownload: () => void;
  onLater: () => void;
};

export default function AppUpdateDialog({
  open,
  currentName,
  latestName,
  downloading,
  message,
  onDownload,
  onLater,
}: AppUpdateDialogProps) {
  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      dir="rtl"
      disableEscapeKeyDown
      onClose={ignoreForcedClose}
      aria-labelledby="app-update-dialog-title"
    >
      <DialogTitle
        id="app-update-dialog-title"
        sx={{ display: "flex", gap: 1.25, alignItems: "center", color: "error.main", fontWeight: 800 }}
      >
        <SystemUpdateAltIcon fontSize="large" />
        {he.appUpdateRequiredTitle}
      </DialogTitle>
      <DialogContent>
        <Typography fontWeight={700} sx={{ mb: 1.5 }}>
          {fillVersionPlaceholders(he.appUpdateRequiredBody, latestName, currentName)}
        </Typography>
        {message ? <Alert severity="warning">{message}</Alert> : null}
      </DialogContent>
      <DialogActions
        sx={{ px: 3, pb: dialogActionsPbCss(), flexDirection: "column", gap: 1, alignItems: "stretch" }}
      >
        <Button
          variant="contained"
          color="error"
          size="large"
          onClick={onDownload}
          disabled={downloading}
          sx={{ fontWeight: 800 }}
        >
          {downloading ? <CircularProgress size={22} color="inherit" /> : he.appUpdateDownload}
        </Button>
        <Button onClick={onLater} disabled={downloading} color="inherit">
          {he.appUpdateLater}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ignoreForcedClose(_event: unknown, reason: string) {
  if (reason === "backdropClick" || reason === "escapeKeyDown") return;
}
