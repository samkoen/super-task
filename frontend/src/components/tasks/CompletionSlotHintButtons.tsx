import { Box, CircularProgress, IconButton } from "@mui/material";
import SubjectIcon from "@mui/icons-material/Subject";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StopIcon from "@mui/icons-material/Stop";
import { he } from "../../i18n/he";

const WRAP_SX = {
  overlay: { position: "absolute" as const, top: 6, left: 6, zIndex: 3, display: "flex", gap: 0.25 },
  inline: { display: "flex", gap: 0.25, flexShrink: 0 },
};

const BUTTON_SX = {
  overlay: {
    color: "common.white",
    bgcolor: "rgba(0,0,0,0.35)",
    "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
  },
  inline: { color: "text.secondary" },
};

export default function CompletionSlotHintButtons({
  speaking,
  loading,
  listenEnabled,
  onShow,
  onSpeak,
  inline = false,
}: {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
  inline?: boolean;
}) {
  const variant = inline ? "inline" : "overlay";
  return (
    <Box sx={WRAP_SX[variant]}>
      <IconButton size="small" aria-label={he.completionShowHint} onClick={onShow} sx={BUTTON_SX[variant]}>
        {loading && !speaking ? <CircularProgress size={16} color="inherit" /> : <SubjectIcon fontSize="small" />}
      </IconButton>
      {listenEnabled && (
        <IconButton
          size="small"
          aria-label={speaking ? he.taskListenStop : he.completionListenHint}
          onClick={onSpeak}
          sx={BUTTON_SX[variant]}
        >
          {speaking ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </IconButton>
      )}
    </Box>
  );
}
