import { useEffect, useState } from "react";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import { IconButton } from "@mui/material";
import { useLocation } from "react-router-dom";
import { he } from "../../i18n/he";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";
import { pushRouteTrail, readRouteTrail } from "../../utils/routeTrail";
import { captureViewportPng } from "../../utils/systemBugCapture";
import { systemBugAppVersion, systemBugPreviewLabel } from "../../utils/systemBugMeta";
import SystemBugDialog from "./SystemBugDialog";

export const systemBugLauncherSx = {
  position: "fixed",
  left: 4,
  bottom: withSystemBottomInsetCss("56px"),
  zIndex: 1050,
  width: 26,
  height: 26,
  p: 0,
  opacity: 0.2,
  color: "text.secondary",
  bgcolor: "transparent",
  "&:hover": { opacity: 0.55, bgcolor: "action.hover" },
} as const;

export default function SystemBugLauncher() {
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);

  useEffect(() => {
    pushRouteTrail(location.pathname);
  }, [location.pathname]);

  const startReport = async () => {
    const shot = await captureViewportPng();
    setScreenshot(shot);
    setOpen(true);
  };

  return (
    <>
      <IconButton
        size="small"
        aria-label={he.systemBug}
        data-system-bug-ignore=""
        onClick={() => void startReport()}
        sx={systemBugLauncherSx}
      >
        <BugReportOutlinedIcon sx={{ fontSize: 14 }} />
      </IconButton>
      <SystemBugDialog
        open={open}
        screenshot={screenshot}
        route={location.pathname}
        trail={readRouteTrail()}
        appVersion={systemBugAppVersion()}
        preview={systemBugPreviewLabel(user)}
        branchName={user?.branch_name ?? ""}
        onClose={() => setOpen(false)}
        onSent={() => showSuccess(he.systemBugSent)}
        onError={showError}
      />
    </>
  );
}
