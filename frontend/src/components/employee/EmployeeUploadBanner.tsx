import { useEffect, useRef } from "react";
import { Box, Typography } from "@mui/material";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { useFeedback } from "../../context/FeedbackContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { usePendingUploads } from "../../hooks/usePendingUploads";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowShadow, flowText } from "../../styles/flowTokens";
import { withSystemBottomInsetCss } from "../../utils/systemInsets";

/** Au-dessus de la barre du bas de l'oved (FLOW 2). */
const BOTTOM_OFFSET_PX = 96;

/** « Tout est parti » une seule fois, quand la file passe de quelque chose à rien. */
function useAllSentToast(count: number) {
  const { showSuccess } = useFeedback();
  const previous = useRef(count);
  useEffect(() => {
    if (previous.current > 0 && count === 0) showSuccess(he.uploadAllSent);
    previous.current = count;
  }, [count, showSuccess]);
}

/**
 * Oved : « אין קליטה · 2 משימות ממתינות לשליחה » tant que des vidéos attendent sur le téléphone.
 * Rien à faire de sa part : elles partent seules au retour du réseau.
 */
export default function EmployeeUploadBanner() {
  const online = useOnlineStatus();
  const { taskCount } = usePendingUploads();
  useAllSentToast(taskCount);
  if (taskCount === 0) return null;
  const Icon = online ? CloudUploadOutlinedIcon : CloudOffRoundedIcon;
  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="employee-upload-banner"
      data-online={online ? "true" : "false"}
      sx={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: withSystemBottomInsetCss(`${BOTTOM_OFFSET_PX}px`),
        zIndex: (t) => t.zIndex.snackbar - 1,
        width: "calc(100% - 32px)",
        maxWidth: 361,
        display: "flex",
        alignItems: "center",
        gap: "10px",
        px: "14px",
        py: "10px",
        borderRadius: `${flowRadius.md}px`,
        bgcolor: online ? flowColor.neutral900 : "#7a5b00",
        color: flowColor.neutral0,
        boxShadow: flowShadow.floating,
      }}
    >
      <Icon sx={{ fontSize: 22, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ ...flowText.button, fontSize: 15, color: "inherit" }}>
          {online ? he.uploadBannerSending(taskCount) : he.uploadBannerOffline(taskCount)}
        </Typography>
        <Typography sx={{ ...flowText.label, color: "inherit", opacity: 0.8 }}>{he.uploadBannerHint}</Typography>
      </Box>
    </Box>
  );
}
