import { Alert, Typography } from "@mui/material";
import TaskFormSection from "../form/TaskFormSection";
import QualityRatingStars from "../QualityRatingStars";
import { he } from "../../../i18n/he";
import type { ReviewSummary } from "../../../utils/slotReview";

type Props = {
  summary: ReviewSummary;
  rating: number | null;
  onRatingChange: (value: number | null) => void;
};

/** Fin du contrôle : ce qui va se passer (tout V = accepté, un X = rouvert), et la note si tout est V. */
export default function SlotReviewFinish({ summary, rating, onRatingChange }: Props) {
  return (
    <TaskFormSection title={he.slotReviewSectionFinish}>
      <OutcomeNotice summary={summary} />
      {summary.outcome === "approve" ? (
        <>
          <Typography color="text.secondary" sx={{ fontSize: "1rem" }}>
            {he.qualityRatingHint}
          </Typography>
          <QualityRatingStars value={rating} onChange={onRatingChange} />
        </>
      ) : null}
    </TaskFormSection>
  );
}

function OutcomeNotice({ summary }: { summary: ReviewSummary }) {
  if (summary.outcome === "approve") {
    return <Alert severity="success" sx={alertSx}>{he.slotReviewOutcomeApprove}</Alert>;
  }
  if (summary.outcome === "reopen") {
    return <Alert severity="warning" sx={alertSx}>{he.slotReviewOutcomeReopen(summary.rejected)}</Alert>;
  }
  return <Alert severity="info" sx={alertSx}>{he.slotReviewRemaining(summary.remaining)}</Alert>;
}

const alertSx = { borderRadius: "14px", fontWeight: 700, fontSize: "1rem" } as const;
