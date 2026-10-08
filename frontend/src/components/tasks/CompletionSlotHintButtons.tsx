import { Box, CircularProgress, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SubjectIcon from "@mui/icons-material/Subject";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StopIcon from "@mui/icons-material/Stop";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_TOUCH_MIN } from "../../styles/employeeUi";

type Variant = "overlay" | "inline" | "large";

const WRAP_SX = {
  overlay: { position: "absolute" as const, top: 6, left: 6, zIndex: 3, display: "flex", gap: 0.25 },
  inline: { display: "flex", gap: 0.25, flexShrink: 0 },
  large: { display: "flex", gap: 0.75, flexShrink: 0 },
};

const BUTTON_SX = {
  overlay: {
    color: "common.white",
    bgcolor: "rgba(0,0,0,0.35)",
    "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
  },
  inline: { color: "text.secondary" },
  large: {
    width: EMPLOYEE_TOUCH_MIN - 8,
    height: EMPLOYEE_TOUCH_MIN - 8,
    color: EMPLOYEE_BRAND,
    bgcolor: alpha(EMPLOYEE_BRAND, 0.1),
    "&:hover": { bgcolor: alpha(EMPLOYEE_BRAND, 0.18) },
  },
};

export default function CompletionSlotHintButtons({
  speaking,
  loading,
  listenEnabled,
  onShow,
  onSpeak,
  inline = false,
  large = false,
}: {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
  inline?: boolean;
  /** Grosses pastilles de 48 px pour l'écran de capture de l'oved. */
  large?: boolean;
}) {
  const variant: Variant = large ? "large" : inline ? "inline" : "overlay";
  const size = large ? "medium" : "small";
  return (
    <Box sx={WRAP_SX[variant]}>
      <IconButton size={size} aria-label={he.completionShowHint} onClick={onShow} sx={BUTTON_SX[variant]}>
        {loading && !speaking ? <CircularProgress size={16} color="inherit" /> : <SubjectIcon fontSize={size} />}
      </IconButton>
      {listenEnabled && (
        <IconButton
          size={size}
          aria-label={speaking ? he.taskListenStop : he.completionListenHint}
          onClick={onSpeak}
          sx={BUTTON_SX[variant]}
        >
          {speaking ? <StopIcon fontSize={size} /> : <VolumeUpIcon fontSize={size} />}
        </IconButton>
      )}
    </Box>
  );
}
