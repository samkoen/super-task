import { Box, Button, Typography } from "@mui/material";
import CompactAudioPlayer from "../media/CompactAudioPlayer";
import CompletionSlotGrid from "./CompletionSlotGrid";
import { he } from "../../i18n/he";
import { displayedAudioTranscript } from "../../utils/displayedAudioTranscript";
import { mediaUrl } from "../../utils/mediaUrl";
import {
  attachmentsFromCompletion,
  fillsFromAttachments,
  visualSlotCount,
} from "../../utils/completionSlotView";
import { normalizeRequirements, type CompletionAttachment, type CompletionRequirement } from "../../utils/completionMedia";

interface CompletionMediaPreviewProps {
  photo_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
  attachments?: CompletionAttachment[] | null;
  requirements?: CompletionRequirement[] | null;
  audio_transcript?: string | null;
  audio_transcript_employee?: string | null;
  viewer?: "employee" | "manager";
  onRemovePhoto?: () => void;
  onRemoveVideo?: () => void;
  onRemoveAudio?: () => void;
  disabled?: boolean;
  /** false = capture en cours, pas encore transcrit. */
  transcriptFallback?: boolean;
}

function kindLabel(kind: string): string {
  if (kind === "video") return he.taskReferenceVideo;
  if (kind === "audio") return he.taskReferenceAudio;
  return he.taskReferencePhoto;
}

export default function CompletionMediaPreview({
  photo_path,
  video_path,
  audio_path,
  attachments,
  requirements,
  audio_transcript,
  audio_transcript_employee,
  viewer = "manager",
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
  disabled = false,
  transcriptFallback = true,
}: CompletionMediaPreviewProps) {
  const items = attachmentsFromCompletion({
    completion_attachments: attachments,
    photo_path,
    video_path,
    audio_path,
  });
  const reqs = normalizeRequirements(requirements);
  const hasVisualGuides = visualSlotCount(reqs) > 0;
  const hasAudio = items.some((item) => item.kind === "audio") || reqs.some((r) => r.kind === "audio");
  const resolvedTranscript = displayedAudioTranscript(
    viewer === "employee"
      ? audio_transcript_employee ?? audio_transcript
      : audio_transcript,
    { hasAudio, allowFallback: transcriptFallback },
  );
  if (!items.length && !resolvedTranscript && !hasVisualGuides) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {he.completionMediaAdded}
      </Typography>
      {hasVisualGuides ? (
        <CompletionSlotGrid
          requirements={reqs}
          fills={fillsFromAttachments(reqs, items)}
        />
      ) : (
        <LegacyAttachmentList
          items={items}
          disabled={disabled}
          onRemovePhoto={onRemovePhoto}
          onRemoveVideo={onRemoveVideo}
          onRemoveAudio={onRemoveAudio}
        />
      )}
      {resolvedTranscript && (
        <Box sx={{ p: 1.25, bgcolor: "action.hover", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {he.completionAudioTranscript}
          </Typography>
          <Typography variant="body2">{resolvedTranscript}</Typography>
        </Box>
      )}
    </Box>
  );
}

function LegacyAttachmentList({
  items,
  disabled,
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
}: {
  items: CompletionAttachment[];
  disabled: boolean;
  onRemovePhoto?: () => void;
  onRemoveVideo?: () => void;
  onRemoveAudio?: () => void;
}) {
  return (
    <>
      {items.map((item, index) => {
        const src = mediaUrl(item.url);
        if (!src) return null;
        return (
          <Box key={`${item.kind}-${index}`}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              {kindLabel(item.kind)}
            </Typography>
            {item.kind === "photo" && (
              <Box component="img" src={src} alt={he.taskReferencePhoto} sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: 1, display: "block" }} />
            )}
            {item.kind === "video" && (
              <Box component="video" src={src} controls sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1, display: "block" }} />
            )}
            {item.kind === "audio" && <CompactAudioPlayer src={src} />}
            {item.kind === "photo" && onRemovePhoto && (
              <Button size="small" color="inherit" disabled={disabled} onClick={onRemovePhoto} sx={{ mt: 0.5 }}>
                {he.removeMedia}
              </Button>
            )}
            {item.kind === "video" && onRemoveVideo && (
              <Button size="small" color="inherit" disabled={disabled} onClick={onRemoveVideo} sx={{ mt: 0.5 }}>
                {he.removeMedia}
              </Button>
            )}
            {item.kind === "audio" && onRemoveAudio && (
              <Button size="small" color="inherit" disabled={disabled} onClick={onRemoveAudio} sx={{ mt: 0.5 }}>
                {he.removeMedia}
              </Button>
            )}
          </Box>
        );
      })}
    </>
  );
}
