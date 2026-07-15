import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

interface TaskReferenceMediaDisplayProps {
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
}

export default function TaskReferenceMediaDisplay({
  reference_photo_url,
  reference_video_url,
  reference_audio_url,
}: TaskReferenceMediaDisplayProps) {
  const photoSrc = mediaUrl(reference_photo_url ?? null);
  const videoSrc = mediaUrl(reference_video_url ?? null);
  const audioSrc = mediaUrl(reference_audio_url ?? null);
  if (!photoSrc && !videoSrc && !audioSrc) return null;

  return (
    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {he.taskReferenceMediaLabel}
      </Typography>
      {photoSrc && (
        <Box
          component="img"
          src={photoSrc}
          alt={he.taskReferencePhoto}
          sx={{ maxWidth: "100%", maxHeight: 220, borderRadius: 1, display: "block" }}
        />
      )}
      {videoSrc && (
        <Box
          component="video"
          src={videoSrc}
          controls
          sx={{ maxWidth: "100%", maxHeight: 240, borderRadius: 1, display: "block" }}
        />
      )}
      {audioSrc && (
        <Box component="audio" src={audioSrc} controls sx={{ width: "100%", display: "block" }} />
      )}
    </Box>
  );
}
