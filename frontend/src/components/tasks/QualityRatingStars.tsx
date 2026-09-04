import { useState } from "react";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { Box, IconButton, Typography } from "@mui/material";
import { he } from "../../i18n/he";

const MAX_STARS = 5;
const STAR_GOLD = "#faaf00";

type QualityRatingStarsProps = {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "small" | "medium";
};

export function previewRating(hover: number, value: number | null): number {
  return hover > 0 ? hover : (value ?? 0);
}

export default function QualityRatingStars({
  value,
  onChange,
  readOnly = false,
  size = "medium",
}: QualityRatingStarsProps) {
  const [hover, setHover] = useState(0);
  const shown = previewRating(hover, value);
  const fontSize = size === "small" ? 18 : 24;

  return (
    <Box
      dir="rtl"
      display="inline-flex"
      alignItems="center"
      role={readOnly ? "img" : "radiogroup"}
      aria-label={he.qualityRating}
      onMouseLeave={() => setHover(0)}
    >
      {Array.from({ length: MAX_STARS }, (_, i) => i + 1).map((n) => (
        <StarSlot
          key={n}
          n={n}
          filled={n <= shown}
          selected={value === n}
          readOnly={readOnly}
          fontSize={fontSize}
          onPick={() => onChange?.(n)}
          onHover={() => setHover(n)}
        />
      ))}
      {readOnly && value != null ? (
        <Typography variant="caption" color="text.secondary" sx={{ ms: 0.5 }} dir="rtl">
          {value.toFixed(1)}
        </Typography>
      ) : null}
    </Box>
  );
}

type StarSlotProps = {
  n: number;
  filled: boolean;
  selected: boolean;
  readOnly: boolean;
  fontSize: number;
  onPick: () => void;
  onHover: () => void;
};

function StarSlot({ n, filled, selected, readOnly, fontSize, onPick, onHover }: StarSlotProps) {
  const icon = filled ? (
    <StarIcon fontSize="inherit" />
  ) : (
    <StarBorderIcon fontSize="inherit" />
  );
  const color = filled ? STAR_GOLD : "action.disabled";
  if (readOnly) {
    return (
      <Box component="span" aria-hidden sx={{ color, fontSize, display: "inline-flex" }}>
        {icon}
      </Box>
    );
  }
  return (
    <IconButton
      role="radio"
      aria-checked={selected}
      aria-label={he.qualityStarLabel(n)}
      data-filled={filled ? "true" : "false"}
      onClick={onPick}
      onMouseEnter={onHover}
      size="small"
      sx={{ color, p: 0.25, fontSize }}
    >
      {icon}
    </IconButton>
  );
}
