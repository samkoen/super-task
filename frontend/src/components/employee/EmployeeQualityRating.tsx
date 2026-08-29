import { Box, Chip, Typography } from "@mui/material";
import type { OpsCategory } from "../../services/taskService";
import { he } from "../../i18n/he";
import {
  hasQualityRatings,
  type QualityRatingSummary,
} from "../../utils/qualityRating";
import QualityRatingStars from "../tasks/QualityRatingStars";

function categoryLabel(category: string): string {
  if (category === "other") return he.opsCategoryNone;
  const labels = he.opsCategoryLabels as Record<string, string>;
  return labels[category] ?? category;
}

export default function EmployeeQualityRating({
  summary,
}: {
  summary?: QualityRatingSummary | null;
}) {
  if (!hasQualityRatings(summary) || !summary) {
    return (
      <Typography variant="caption" color="text.secondary">
        {he.qualityRatingNone}
      </Typography>
    );
  }
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={0.75} flexWrap="wrap">
        <QualityRatingStars value={summary.average} readOnly size="small" />
        <Typography variant="caption" color="text.secondary">
          {he.qualityRatingCount(summary.count)}
        </Typography>
      </Box>
      <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
        {summary.by_category.map((row) => (
          <Chip
            key={row.category}
            size="small"
            variant="outlined"
            label={`${categoryLabel(row.category as OpsCategory)} ${row.average.toFixed(1)}`}
          />
        ))}
      </Box>
    </Box>
  );
}
