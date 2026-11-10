import { Box, ButtonBase } from "@mui/material";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { PLAYBACK_SPEEDS, speedLabel, type PlaybackSpeed } from "../../utils/flowPlayer";

function SpeedPill({ speed, selected, onClick }: { speed: PlaybackSpeed; selected: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      aria-pressed={selected}
      data-testid={`flow-speed-${speed}`}
      onClick={onClick}
      sx={{
        px: "12px",
        py: "6px",
        borderRadius: `${flowRadius.md}px`,
        ...flowText.label,
        color: selected ? flowColor.navy800 : flowColor.neutral0,
        bgcolor: selected ? flowColor.neutral0 : "transparent",
      }}
    >
      {speedLabel(speed)}
    </ButtonBase>
  );
}

/** Vitesse de lecture 0.5× / 1× : proposée uniquement quand l'oved revoit sa vidéo, jamais pendant la prise. */
export default function FlowSpeedToggle({ speed, onChoose }: { speed: PlaybackSpeed; onChoose: (speed: PlaybackSpeed) => void }) {
  return (
    <Box
      role="group"
      aria-label={he.flowPlayerSpeed}
      data-testid="flow-speed-toggle"
      sx={{ direction: "ltr", display: "flex", gap: "4px", p: "4px", borderRadius: "20px", bgcolor: flowColor.alphaNavy800_60 }}
    >
      {PLAYBACK_SPEEDS.map((value) => (
        <SpeedPill key={value} speed={value} selected={speed === value} onClick={() => onChoose(value)} />
      ))}
    </Box>
  );
}
