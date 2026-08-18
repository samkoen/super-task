import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { displayedAudioTranscript } from "../../utils/displayedAudioTranscript";
import { mediaUrl } from "../../utils/mediaUrl";
import type { CompletionAttachment } from "../../utils/completionMedia";

interface CompletionMediaPreviewProps {
  photo_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
  attachments?: CompletionAttachment[] | null;
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
  audio_transcript,
  audio_transcript_employee,
  viewer = "manager",
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
  disabled = false,
  transcriptFallback = true,
}: CompletionMediaPreviewProps) {
  const items =
    attachments && attachments.length > 0
      ? attachments
      : ([
          photo_path ? { kind: "photo" as const, url: photo_path } : null,
          video_path ? { kind: "video" as const, url: video_path } : null,
          audio_path ? { kind: "audio" as const, url: audio_path } : null,
        ].filter(Boolean) as CompletionAttachment[]);
  const hasAudio = items.some((item) => item.kind === "audio");
  const resolvedTranscript = displayedAudioTranscript(
    viewer === "employee"
      ? audio_transcript_employee ?? audio_transcript
      : audio_transcript,
    { hasAudio, allowFallback: transcriptFallback },
  );
  if (!items.length && !resolvedTranscript) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {he.completionMediaAdded}
      </Typography>
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
            {item.kind === "audio" && (
              <Box component="audio" src={src} controls sx={{ width: "100%", display: "block" }} />
            )}
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
