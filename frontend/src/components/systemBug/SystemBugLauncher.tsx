import { useEffect, useState } from "react";
import { useTopModalPortalHost } from "../../hooks/useTopModalPortalHost";
import { createPortal } from "react-dom";
import BugReportOutlinedIcon from "@mui/icons-material/BugReportOutlined";
import { IconButton } from "@mui/material";
import { useLocation } from "react-router-dom";
import { he } from "../../i18n/he";
import { SIDEBAR_WIDTH } from "../../constants/layout";
import { useAuth } from "../../context/AuthContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useEmployeeStartDoorOpen } from "../../hooks/useEmployeeStartDoorOpen";
import { usesEmployeeChrome } from "../../utils/employeeSurface";
import { isNativeApp } from "../../utils/isNativeApp";
import { shouldUseMainNavOverlay } from "../../utils/mainNavOverlay";
import {
  managerFabBottomCss,
  shouldShowManagerChrome,
} from "../../utils/managerBottomNav";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";
import { employeeBottomNavFabBottomCss } from "../../utils/employeeBottomNav";
import { pushRouteTrail, readRouteTrail } from "../../utils/routeTrail";
import { captureViewportPng } from "../../utils/systemBugCapture";
import { systemBugAppVersion, systemBugPreviewLabel } from "../../utils/systemBugMeta";
import SystemBugDialog from "./SystemBugDialog";

/** Évite d’être sous la barre menahel (272px) en desktop navigateur. */
export function systemBugLauncherLeft(besideSidebar: boolean) {
  if (!besideSidebar) return 8;
  return { xs: 8, sm: SIDEBAR_WIDTH + 8 };
}

/**
 * Côté du bouton : avec la barre oved, il passe à droite pour laisser le coin
 * bas-gauche au FAB « צ׳אט חדש » de l'écran des chats.
 */
export function systemBugLauncherSide(besideSidebar: boolean, employeeNav: boolean) {
  if (employeeNav) return { right: 8 };
  return { left: systemBugLauncherLeft(besideSidebar) };
}

/** Au-dessus de la pilule menahel, sinon juste au-dessus du bord. */
export function systemBugLauncherBottom(managerChrome: boolean, employeeNav = false) {
  if (employeeNav) return employeeBottomNavFabBottomCss();
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
  employeeNav,
  onClick,
}: {
  besideSidebar: boolean;
  managerChrome: boolean;
  employeeNav: boolean;
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
        ...systemBugLauncherSide(besideSidebar, employeeNav),
        bottom: systemBugLauncherBottom(managerChrome, employeeNav),
      }}
    >
      <BugReportOutlinedIcon sx={{ fontSize: 18 }} />
    </IconButton>
  );
}

export default function SystemBugLauncher() {
  const location = useLocation();
  const { user } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const [open, setOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<Blob | null>(null);
  const host = useTopModalPortalHost();
  const startDoorOpen = useEmployeeStartDoorOpen();

  useEffect(() => {
    pushRouteTrail(location.pathname);
  }, [location.pathname]);

  const overlayNav = shouldUseMainNavOverlay(isNativeApp());
  const employeeChrome = usesEmployeeChrome(user?.role, location.pathname);
  const managerChrome = shouldShowManagerChrome(user?.role, location.pathname);
  // La coque menahel n'a plus de menu latéral : seul l'admin garde la barre de gauche.
  const besideSidebar = Boolean(user) && !employeeChrome && !overlayNav && !managerChrome;

  const startReport = async () => {
    let shot: Blob | null = null;
    try {
      shot = await captureViewportPng();
    } catch {
      shot = null;
    }
    setScreenshot(shot);
    setOpen(true);
  };

  const button = (
    <SystemBugTrigger
      besideSidebar={besideSidebar}
      managerChrome={managerChrome}
      employeeNav={employeeChrome && !startDoorOpen}
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
