import { useState } from "react";
import { createPortal } from "react-dom";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { Button } from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import { useTopModalPortalHost } from "../../hooks/useTopModalPortalHost";
import { he } from "../../i18n/he";
import { isViewAsPreview } from "../../utils/viewAsPreview";

/**
 * צפייה כעובד : bouton flottant « חזרה לניהול » sur tous les écrans, y compris
 * par-dessus les écrans plein écran. Absent quand l'oved s'est connecté lui-même.
 * Collé au bord gauche, à mi-hauteur : loin des barres du haut et du bas.
 */
export default function ViewAsExitFab() {
  const { user, exitViewAs } = useAuth();
  const host = useTopModalPortalHost();
  const [busy, setBusy] = useState(false);

  if (!isViewAsPreview(user) || !host) return null;

  const handleExit = async () => {
    setBusy(true);
    try {
      await exitViewAs();
    } catch {
      setBusy(false);
    }
  };

  return createPortal(
    <Button
      variant="contained"
      color="warning"
      size="small"
      disabled={busy}
      data-system-bug-ignore=""
      startIcon={<VisibilityOffOutlinedIcon />}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        void handleExit();
      }}
      sx={{
        position: "fixed",
        zIndex: 1400,
        left: 0,
        top: "50%",
        transform: "translateY(-50%)",
        borderRadius: "0 20px 20px 0",
        pl: 1.25,
        pr: 1.5,
        fontWeight: 700,
        boxShadow: 3,
        "&.Mui-disabled": { bgcolor: "warning.light", color: "#fff" },
      }}
    >
      {he.viewAsExit}
    </Button>,
    host,
  );
}
