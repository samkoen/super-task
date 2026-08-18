import { Box, Button, Typography } from "@mui/material";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import {
  type PendingMedia,
  replacePendingMedia,
  revokePendingMedia,
} from "../../utils/pendingMedia";

function slotLabel(req: CompletionRequirement, index: number): string {
  if (req.kind === "video") {
    return `${he.completionRequirementN(index + 1)} · ${he.completionSlotVideoMin(req.min_seconds ?? 10)}`;
  }
  const kindLabel = req.kind === "audio" ? he.completionSlotAudio : he.completionSlotPhoto;
  return `${he.completionRequirementN(index + 1)} · ${kindLabel}`;
}

export default function CompletionRequirementSlots({
  requirements,
  slots,
  onChange,
  disabled = false,
}: {
  requirements: CompletionRequirement[];
  slots: Array<PendingMedia | null>;
  onChange: (next: Array<PendingMedia | null>) => void;
  disabled?: boolean;
}) {
  if (!requirements.length) return null;

  const setSlot = (index: number, file: File, kind: MediaKind, durationSeconds?: number) => {
    const next = [...slots];
    next[index] = replacePendingMedia(slots[index] ?? null, file, durationSeconds ?? null);
    onChange(next);
  };

  const clearSlot = (index: number) => {
    const next = [...slots];
    revokePendingMedia(slots[index]);
    next[index] = null;
    onChange(next);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {requirements.map((req, index) => {
        const media = slots[index] ?? null;
        return (
          <Box
            key={`${req.kind}-${index}`}
            sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25 }}
          >
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              {slotLabel(req, index)}
            </Typography>
            <MediaCaptureActions
              photoAdded={req.kind === "photo" && Boolean(media)}
              videoAdded={req.kind === "video" && Boolean(media)}
              audioAdded={req.kind === "audio" && Boolean(media)}
              uploadingKind={null}
              disabled={disabled}
              allowedKinds={[req.kind]}
              minVideoSeconds={req.kind === "video" ? req.min_seconds ?? null : null}
              onCapture={(file, kind, meta) => setSlot(index, file, kind, meta?.durationSeconds)}
            />
            {media?.previewUrl && req.kind === "photo" && (
              <Box component="img" src={media.previewUrl} alt="" sx={{ mt: 1, maxWidth: "100%", maxHeight: 140, borderRadius: 1 }} />
            )}
            {media?.previewUrl && req.kind === "video" && (
              <Box component="video" src={media.previewUrl} controls sx={{ mt: 1, maxWidth: "100%", maxHeight: 160, borderRadius: 1 }} />
            )}
            {media?.previewUrl && req.kind === "audio" && (
              <Box component="audio" src={media.previewUrl} controls sx={{ mt: 1, width: "100%" }} />
            )}
            {media && (
              <Button size="small" color="inherit" disabled={disabled} onClick={() => clearSlot(index)} sx={{ mt: 0.5 }}>
                {he.removeMedia}
              </Button>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
