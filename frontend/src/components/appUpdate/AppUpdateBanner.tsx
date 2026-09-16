import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";
import { Alert, Button, CircularProgress, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { fillVersionPlaceholders } from "../../utils/appRelease";
import { systemTopInsetCss } from "../../utils/systemInsets";

export type AppUpdateBannerProps = {
  latestName: string;
  downloading: boolean;
  message: string;
  onDownload: () => void;
};

export default function AppUpdateBanner({
  latestName,
  downloading,
  message,
  onDownload,
}: AppUpdateBannerProps) {
  return (
    <Alert
      role="status"
      severity="error"
      variant="filled"
      icon={<SystemUpdateAltIcon />}
      sx={{
        position: "fixed",
        top: `max(8px, ${systemTopInsetCss()})`,
        left: 8,
        right: 8,
        zIndex: (t) => t.zIndex.snackbar + 2,
        alignItems: "center",
        boxShadow: 8,
        fontWeight: 800,
      }}
      action={
        <Button
          color="inherit"
          variant="outlined"
          onClick={onDownload}
          disabled={downloading}
          sx={{ fontWeight: 800, borderColor: "inherit" }}
        >
          {downloading ? <CircularProgress size={18} color="inherit" /> : he.appUpdateDownload}
        </Button>
      }
    >
      <Typography fontWeight={800} display="block">
        {fillVersionPlaceholders(he.appUpdateBanner, latestName)}
      </Typography>
      {message ? (
        <Typography variant="body2" display="block">
          {message}
        </Typography>
      ) : null}
    </Alert>
  );
}
