import { useState, type ReactNode } from "react";
import { ButtonBase, Dialog, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { summarizePendingUploads } from "../../hooks/usePendingUploads";
import { flowColor, flowText } from "../../styles/flowTokens";
import { getSlotUploadQueue } from "../../utils/slotSender";
import type { SlotUploadQueue } from "../../utils/slotUploadQueue";
import { studioPrimarySx, studioSecondarySx } from "../tasks/fixed/studio/studioUi";

/** Nombre de tâches dont des vidéos attendent encore la קליטה sur ce téléphone (0 si la file est illisible). */
export async function pendingUploadTaskCount(queue: Pick<SlotUploadQueue, "list">): Promise<number> {
  try {
    return summarizePendingUploads(await queue.list()).taskCount;
  } catch {
    return 0;
  }
}

/**
 * « התנתקות » avec des vidéos pas encore envoyées : on prévient d'abord (déconnecté, elles ne partiraient plus).
 * Sans rien en attente, la déconnexion est immédiate.
 */
export function useLogoutGuard(logout: () => void, queueFactory: () => Pick<SlotUploadQueue, "list"> = getSlotUploadQueue): {
  requestLogout: () => void;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState(0);
  const requestLogout = () => {
    void pendingUploadTaskCount(queueFactory()).then((count) => (count > 0 ? setPending(count) : logout()));
  };
  const dialog = (
    <Dialog
      open={pending > 0}
      onClose={() => setPending(0)}
      dir="rtl"
      PaperProps={{ sx: { borderRadius: "28px", p: "24px", width: "100%", maxWidth: 345, display: "flex", flexDirection: "column", gap: "12px" } }}
    >
      <Typography component="h2" sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{he.logoutPendingTitle}</Typography>
      <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.logoutPendingBody(pending)}</Typography>
      <ButtonBase data-testid="logout-pending-stay" onClick={() => setPending(0)} sx={{ ...studioPrimarySx, mt: "8px" }}>
        {he.logoutPendingStay}
      </ButtonBase>
      <ButtonBase
        data-testid="logout-pending-anyway"
        onClick={() => {
          setPending(0);
          logout();
        }}
        sx={{ ...studioSecondarySx, color: "#b3261e" }}
      >
        {he.logoutPendingAnyway}
      </ButtonBase>
    </Dialog>
  );
  return { requestLogout, dialog };
}
