import type { ReactNode } from "react";
import { Dialog, DialogActions, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import { dialogStackedActionsSx } from "../../styles/dialogUi";
import AppDialogTitle from "./AppDialogTitle";

/**
 * Fenêtre de formulaire : plein écran sur téléphone, titre avec croix de 48 px,
 * contenu défilant et boutons d'action toujours visibles en bas (action principale en haut).
 */
export default function FormDialog({
  open,
  title,
  onClose,
  busy = false,
  maxWidth = "sm",
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  /** Envoi en cours : bloque la fermeture. */
  busy?: boolean;
  maxWidth?: "xs" | "sm" | "md";
  children: ReactNode;
  actions: ReactNode;
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Dialog
      open={open}
      onClose={busy ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth={maxWidth}
      dir="rtl"
    >
      <AppDialogTitle title={title} onClose={onClose} closeDisabled={busy} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
        {children}
      </DialogContent>
      <DialogActions sx={{ ...dialogStackedActionsSx, borderTop: 1, borderColor: "divider", pt: 1.5 }}>
        {actions}
      </DialogActions>
    </Dialog>
  );
}
