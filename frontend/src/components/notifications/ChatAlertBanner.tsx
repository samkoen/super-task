import { Alert, Button, Snackbar, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { systemTopInsetCss } from "../../utils/systemInsets";

export type ChatAlertBannerState = {
  title: string;
  message: string;
} | null;

export default function ChatAlertBanner({
  alert,
  onOpen,
  onClose,
}: {
  alert: ChatAlertBannerState;
  onOpen: () => void;
  onClose: () => void;
}) {
  return (
    <Snackbar
      open={Boolean(alert)}
      onClose={(_, reason) => {
        if (reason === "clickaway") return;
        onClose();
      }}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ top: `max(8px, ${systemTopInsetCss()})` }}
    >
      <Alert
        severity="warning"
        variant="filled"
        onClose={onClose}
        sx={{ width: { xs: "100%", sm: 420 }, borderRadius: 2, alignItems: "center" }}
        action={
          <Button color="inherit" size="small" onClick={onOpen} sx={{ fontWeight: 800 }}>
            {he.openTask}
          </Button>
        }
      >
        <Typography fontWeight={800} display="block">{alert?.title}</Typography>
        <Typography variant="body2">{alert?.message}</Typography>
      </Alert>
    </Snackbar>
  );
}
