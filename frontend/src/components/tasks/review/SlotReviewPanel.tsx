import { useState } from "react";
import { Box, Button, LinearProgress, Typography } from "@mui/material";
import DoneAllRoundedIcon from "@mui/icons-material/DoneAllRounded";
import SectionHeading from "../../ui/SectionHeading";
import CompletionExampleDialog from "../CompletionExampleDialog";
import SlotRemarkDialog from "./SlotRemarkDialog";
import SlotReviewCard from "./SlotReviewCard";
import { he } from "../../../i18n/he";
import {
  approveAll,
  approvedDraft,
  setDraft,
  summarizeReview,
  type ReviewItem,
  type SlotDraft,
  type SlotDrafts,
} from "../../../utils/slotReview";

type Props = {
  items: ReviewItem[];
  drafts: SlotDrafts;
  onDraftsChange: (next: SlotDrafts) => void;
  videosPending?: boolean;
  disabled?: boolean;
};

type Enlarged = { src: string; kind: "photo" | "video" };

/** Côté menahel : V ou X sur chaque sous-tâche, remarque + flèches/ronds sur les X. */
export default function SlotReviewPanel({ items, drafts, onDraftsChange, videosPending = false, disabled = false }: Props) {
  const [remarkIndex, setRemarkIndex] = useState<number | null>(null);
  const [enlarged, setEnlarged] = useState<Enlarged | null>(null);
  const summary = summarizeReview(items, drafts);
  const editing = items.find((item) => item.index === remarkIndex) ?? null;
  const blocked = disabled || videosPending;

  const saveRemark = (draft: SlotDraft) => {
    if (remarkIndex !== null) onDraftsChange(setDraft(drafts, remarkIndex, draft));
    setRemarkIndex(null);
  };

  return (
    <Box component="section" aria-label={he.slotReviewTitle} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SectionHeading title={he.slotReviewTitle} mb={0} />
      <ProgressBar
        total={summary.total}
        decided={summary.decided}
        canApproveAll={summary.remaining > 0 && !blocked}
        onApproveAll={() => onDraftsChange({ ...approveAll(items), ...keepRejected(items, drafts) })}
      />
      {items.map((item, position) => (
        <SlotReviewCard
          key={item.index}
          item={item}
          position={position + 1}
          draft={drafts[item.index]}
          disabled={blocked}
          videoPending={videosPending}
          onApprove={() => onDraftsChange(setDraft(drafts, item.index, approvedDraft()))}
          onReject={() => setRemarkIndex(item.index)}
          onEnlarge={(src, kind) => setEnlarged({ src, kind })}
        />
      ))}
      <SlotRemarkDialog
        open={Boolean(editing)}
        title={editing?.title ?? ""}
        kind={editing?.attachment.kind ?? "photo"}
        mediaUrl={editing?.attachment.url ?? null}
        initial={editing ? drafts[editing.index] : null}
        onSave={saveRemark}
        onClose={() => setRemarkIndex(null)}
      />
      <CompletionExampleDialog
        src={enlarged?.src ?? null}
        title=""
        kind={enlarged?.kind}
        onClose={() => setEnlarged(null)}
      />
    </Box>
  );
}

function keepRejected(items: ReviewItem[], drafts: SlotDrafts): SlotDrafts {
  return Object.fromEntries(
    items.filter((item) => drafts[item.index]?.status === "rejected").map((item) => [item.index, drafts[item.index]]),
  );
}

function ProgressBar({
  total,
  decided,
  canApproveAll,
  onApproveAll,
}: {
  total: number;
  decided: number;
  canApproveAll: boolean;
  onApproveAll: () => void;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography color="text.secondary" sx={{ fontSize: "1rem" }}>
        {he.slotReviewHint}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <LinearProgress
          variant="determinate"
          value={total ? (decided / total) * 100 : 0}
          sx={{ flex: 1, height: 10, borderRadius: 5 }}
        />
        <Typography fontWeight={800} sx={{ whiteSpace: "nowrap" }}>
          {he.slotReviewProgress(decided, total)}
        </Typography>
      </Box>
      {canApproveAll ? (
        <Button
          variant="outlined"
          color="success"
          startIcon={<DoneAllRoundedIcon />}
          onClick={onApproveAll}
          sx={{ alignSelf: "flex-start", minHeight: 44, borderRadius: "14px", fontWeight: 800 }}
        >
          {he.slotReviewApproveAll}
        </Button>
      ) : null}
    </Box>
  );
}
