import { Box, CircularProgress, IconButton } from "@mui/material";
import SubjectIcon from "@mui/icons-material/Subject";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import StopIcon from "@mui/icons-material/Stop";
import { he } from "../../i18n/he";

export default function CompletionSlotHintButtons({
  speaking,
  loading,
  listenEnabled,
  onShow,
  onSpeak,
}: {
  speaking: boolean;
  loading: boolean;
  listenEnabled: boolean;
  onShow: () => void;
  onSpeak: () => void;
}) {
  return (
    <Box sx={{ position: "absolute", top: 6, left: 6, zIndex: 3, display: "flex", gap: 0.25 }}>
      <IconButton
        size="small"
        aria-label={he.completionShowHint}
        onClick={onShow}
        sx={{ color: "common.white", bgcolor: "rgba(0,0,0,0.35)", "&:hover": { bgcolor: "rgba(0,0,0,0.5)" } }}
      >
        {loading && !speaking ? <CircularProgress size={16} color="inherit" /> : <SubjectIcon fontSize="small" />}
      </IconButton>
      {listenEnabled && (
        <IconButton
          size="small"
          aria-label={speaking ? he.taskListenStop : he.completionListenHint}
          onClick={onSpeak}
          sx={{ color: "common.white", bgcolor: "rgba(0,0,0,0.35)", "&:hover": { bgcolor: "rgba(0,0,0,0.5)" } }}
        >
          {speaking ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
        </IconButton>
      )}
    </Box>
  );
}
