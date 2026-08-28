import { Box, Rating, Typography } from "@mui/material";
import { he } from "../../i18n/he";

type QualityRatingStarsProps = {
  value: number | null;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "small" | "medium";
};

export default function QualityRatingStars({
  value,
  onChange,
  readOnly = false,
  size = "medium",
}: QualityRatingStarsProps) {
  return (
    <Box dir="ltr" display="inline-flex" alignItems="center">
      <Rating
        name="quality-rating"
        value={value}
        max={5}
        size={size}
        readOnly={readOnly}
        onChange={(_, next) => {
          if (readOnly || next == null) return;
          onChange?.(next);
        }}
        aria-label={he.qualityRating}
      />
      {readOnly && value != null ? (
        <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }} dir="rtl">
          {value.toFixed(1)}
        </Typography>
      ) : null}
    </Box>
  );
}
