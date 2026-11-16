import { Alert, Box, Typography } from "@mui/material";
import CompactAudioPlayer from "../../media/CompactAudioPlayer";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { he } from "../../../i18n/he";
import type { CompletionAttachment, CompletionRequirement } from "../../../utils/completionMedia";
import { skipReasonLabel, skippedSlots, type SkippedSlot } from "../../../utils/slotSkip";

type Props = {
  requirements: CompletionRequirement[];
  attachments: CompletionAttachment[] | null | undefined;
};

function SkipAudio({ url }: { url: string }) {
  const resolved = useResolvedMediaSrc(url, true);
  if (!resolved.src) return null;
  return (
    <Box data-testid="skipped-slot-audio">
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {he.flowSkipManagerAudio}
      </Typography>
      <CompactAudioPlayer src={resolved.src} />
    </Box>
  );
}

function SkippedItem({ slot }: { slot: SkippedSlot }) {
  const text = (slot.skip.reason_text || "").trim();
  const audio = (slot.skip.audio_url || "").trim();
  return (
    <Box data-testid="skipped-slot" sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="body2" fontWeight={700}>
        {slot.title}
      </Typography>
      <Typography variant="body2" data-testid="skipped-slot-reason">
        {skipReasonLabel(slot.skip.reason_code)}
      </Typography>
      {text ? (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }} data-testid="skipped-slot-text">
          {text}
        </Typography>
      ) : null}
      {audio ? <SkipAudio url={audio} /> : null}
      {!text && !audio ? (
        <Typography variant="caption" color="text.secondary">
          {he.flowSkipManagerNoDetails}
        </Typography>
      ) : null}
    </Box>
  );
}

/** Sous-tâches déclarées « לא ניתן לצלם » par l'oved : raison, explication écrite et vocale, lisibles par le menahel. */
export default function SkippedSlotsSection({ requirements, attachments }: Props) {
  const slots = skippedSlots(requirements, attachments);
  if (!slots.length) return null;
  return (
    <Alert severity="warning" icon={false} data-testid="skipped-slots" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
      <Typography variant="subtitle2" fontWeight={800} mb={1}>
        {he.flowSkipManagerTitle}
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {slots.map((slot) => (
          <SkippedItem key={slot.index} slot={slot} />
        ))}
      </Box>
    </Alert>
  );
}
