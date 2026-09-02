import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import { IconButton } from "@mui/material";
import { useLocation } from "react-router-dom";
import { he } from "../../i18n/he";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { usesEmployeeChrome } from "../../utils/employeeSurface";
import { isNativeApp } from "../../utils/isNativeApp";
import { shouldUseMainNavOverlay } from "../../utils/mainNavOverlay";
import {
  managerFabBottomCss,
  shouldShowManagerChrome,
} from "../../utils/managerBottomNav";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";
import { pushRouteTrail, readRouteTrail } from "../../utils/routeTrail";
import { captureViewportPng } from "../../utils/systemBugCapture";
import { pickSystemBugPortalHost } from "../../utils/systemBugPortal";
import { systemBugAppVersion, systemBugPreviewLabel } from "../../utils/systemBugMeta";
import SystemBugDialog from "./SystemBugDialog";

/** Évite d’être sous la barre menahel (272px) en desktop navigateur. */
export function systemBugLauncherLeft(besideSidebar: boolean) {
  if (!besideSidebar) return 8;
  return { xs: 8, sm: SIDEBAR_WIDTH + 8 };
}

/** Au-dessus de la bottom nav menahel, sinon juste au-dessus du bord. */
export function systemBugLauncherBottom(managerChrome: boolean) {
  return managerChrome ? managerFabBottomCss() : withSystemBottomInsetCss("16px");
}

export const systemBugLauncherSx = {
  position: "fixed",
  zIndex: 1400,
  width: 36,
  height: 36,
  p: 0,
  opacity: 0.85,
  color: "text.secondary",
  bgcolor: "background.paper",
  boxShadow: 1,
  border: "1px solid",
  borderColor: "divider",
  "&:hover": { opacity: 1, bgcolor: "action.hover" },
} as const;

function SystemBugTrigger({
  besideSidebar,
  managerChrome,
  onClick,
}: {
  besideSidebar: boolean;
  managerChrome: boolean;
  onClick: () => void;
}) {
  return (
    <IconButton
      size="small"
      aria-label={he.systemBug}
      data-system-bug-ignore=""
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      sx={{
        ...systemBugLauncherSx,
        left: systemBugLauncherLeft(besideSidebar),
        bottom: systemBugLauncherBottom(managerChrome),
      }}
    >
      <BugReportOutlinedIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );
}

function useSystemBugPortalHost() {
  const [host, setHost] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  useEffect(() => {
    const sync = () => setHost(pickSystemBugPortalHost(document.body));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { childList: true });
    return () => obs.disconnect();
  }, []);
  return host;
}

export default function SystemBugLauncher() {
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const host = useSystemBugPortalHost();

  useEffect(() => {
    pushRouteTrail(location.pathname);
  }, [location.pathname]);

  const overlayNav = shouldUseMainNavOverlay(isNativeApp());
  const employeeChrome = usesEmployeeChrome(user?.role, location.pathname);
  const besideSidebar = Boolean(user) && !employeeChrome && !overlayNav;
  const managerChrome = shouldShowManagerChrome(user?.role, location.pathname);

  const startReport = async () => {
    const shot = await captureViewportPng();
    setScreenshot(shot);
    setOpen(true);
  };

  const button = (
    <SystemBugTrigger
      besideSidebar={besideSidebar}
      managerChrome={managerChrome}
      onClick={() => void startReport()}
    />
  );

  return (
    <>
      {!open && host ? createPortal(button, host) : null}
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
