import { Box, Button, Typography, alpha } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SlotMedia from "./SlotMedia";
import SlotRemarkView, { REJECT_COLOR } from "./SlotRemarkView";
import { he } from "../../../i18n/he";
import { employeeCardSx } from "../../../styles/employeeUi";
import type { ReviewItem, SlotDraft } from "../../../utils/slotReview";

const APPROVE_COLOR = "#2E7D32";

type Props = {
  item: ReviewItem;
  position: number;
  draft: SlotDraft | undefined;
  disabled?: boolean;
  videoPending?: boolean;
  onApprove: () => void;
  onReject: () => void;
  onEnlarge: (src: string, kind: "photo" | "video") => void;
};

function ringColor(draft: SlotDraft | undefined): string | null {
  if (!draft) return null;
  return draft.status === "approved" ? APPROVE_COLOR : REJECT_COLOR;
}

/** Une sous-tâche rendue par l'oved, avec ses deux gros boutons V / X. */
export default function SlotReviewCard(props: Props) {
  const { item, position, draft, disabled, videoPending, onApprove, onReject, onEnlarge } = props;
  const ring = ringColor(draft);
  const previouslyApproved = item.attachment.review?.status === "approved" && draft?.status === "approved";
  return (
    <Box
      component="section"
      data-testid="slot-review-card"
      data-status={draft?.status ?? "none"}
      sx={{
        ...employeeCardSx,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        p: 2,
        ...(ring ? { boxShadow: `0 0 0 3px ${ring}` } : {}),
      }}
    >
      <CardHeading
        number={position}
        title={item.title}
        optional={!item.required}
        verdict={draft?.status}
        previouslyApproved={previouslyApproved}
      />
      <SlotMedia attachment={item.attachment} title={item.title} videoPending={videoPending} onEnlarge={onEnlarge} />
      <VerdictButtons
        verdict={draft?.status}
        disabled={disabled}
        onApprove={onApprove}
        onReject={onReject}
        title={item.title}
      />
      {draft?.status === "rejected" ? (
        <RejectedRemark draft={draft} disabled={disabled} onEdit={onReject} onEnlarge={(src) => onEnlarge(src, "photo")} />
      ) : null}
    </Box>
  );
}

function CardHeading({
  number,
  title,
  optional,
  verdict,
  previouslyApproved,
}: {
  number: number;
  title: string;
  optional: boolean;
  verdict?: SlotDraft["status"];
  previouslyApproved: boolean;
}) {
  const label = previouslyApproved
    ? he.slotReviewPreviouslyApproved
    : verdict === "approved"
      ? he.slotReviewApprovedLabel
      : verdict === "rejected"
        ? he.slotReviewRejectedLabel
        : null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
      <Box
        aria-hidden
        sx={{
          width: 34,
          height: 34,
          flexShrink: 0,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          color: "primary.main",
          bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
        }}
      >
        {number}
      </Box>
      <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: "1.1rem", overflowWrap: "anywhere" }}>
        {title}
      </Typography>
      {label ? <VerdictChip label={label} rejected={verdict === "rejected"} /> : null}
      {optional ? <Typography variant="caption" color="text.secondary">{he.slotReviewOptional}</Typography> : null}
    </Box>
  );
}

function VerdictChip({ label, rejected }: { label: string; rejected: boolean }) {
  const color = rejected ? REJECT_COLOR : APPROVE_COLOR;
  return (
    <Box
      component="span"
      sx={{ px: 1.25, py: 0.4, borderRadius: 999, fontSize: "0.8rem", fontWeight: 800, color, bgcolor: alpha(color, 0.12) }}
    >
      {label}
    </Box>
  );
}

function verdictSx(color: string, active: boolean) {
  return {
    flex: 1,
    minHeight: 56,
    borderRadius: "14px",
    fontSize: "1.1rem",
    fontWeight: 800,
    ...(active
      ? { color: "#fff", bgcolor: color, "&:hover": { bgcolor: color, filter: "brightness(0.95)" } }
      : { color, borderColor: alpha(color, 0.5), "&:hover": { borderColor: color, bgcolor: alpha(color, 0.06) } }),
  } as const;
}

function VerdictButtons({
  verdict,
  disabled,
  onApprove,
  onReject,
  title,
}: {
  verdict?: SlotDraft["status"];
  disabled?: boolean;
  onApprove: () => void;
  onReject: () => void;
  title: string;
}) {
  return (
    <Box sx={{ display: "flex", gap: 1.25 }}>
      <Button
        variant={verdict === "approved" ? "contained" : "outlined"}
        disabled={disabled}
        onClick={onApprove}
        startIcon={<CheckRoundedIcon />}
        aria-pressed={verdict === "approved"}
        aria-label={`${he.slotReviewApprove}: ${title}`}
        sx={verdictSx(APPROVE_COLOR, verdict === "approved")}
      >
        {he.slotReviewApprove}
      </Button>
      <Button
        variant={verdict === "rejected" ? "contained" : "outlined"}
        disabled={disabled}
        onClick={onReject}
        startIcon={<CloseRoundedIcon />}
        aria-pressed={verdict === "rejected"}
        aria-label={`${he.slotReviewReject}: ${title}`}
        sx={verdictSx(REJECT_COLOR, verdict === "rejected")}
      >
        {he.slotReviewReject}
      </Button>
    </Box>
  );
}

function RejectedRemark({
  draft,
  disabled,
  onEdit,
  onEnlarge,
}: {
  draft: SlotDraft;
  disabled?: boolean;
  onEdit: () => void;
  onEnlarge: (src: string) => void;
}) {
  return (
    <>
      <SlotRemarkView remark={draft.remark} imageUrl={draft.annotatedPreviewUrl} onEnlarge={onEnlarge} />
      <Button
        size="small"
        startIcon={<EditRoundedIcon />}
        disabled={disabled}
        onClick={onEdit}
        sx={{ alignSelf: "flex-start", minHeight: 40, borderRadius: "12px", fontWeight: 700 }}
      >
        {he.slotReviewEditRemark}
      </Button>
    </>
  );
}
