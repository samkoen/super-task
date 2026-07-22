import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

interface CompletionMediaPreviewProps {
  photo_path?: string | null;
  video_path?: string | null;
  audio_path?: string | null;
  audio_transcript?: string | null;
  audio_transcript_employee?: string | null;
  viewer?: "employee" | "manager";
  onRemovePhoto?: () => void;
  onRemoveVideo?: () => void;
  onRemoveAudio?: () => void;
  disabled?: boolean;
}

export default function CompletionMediaPreview({
  photo_path,
  video_path,
  audio_path,
  audio_transcript,
  audio_transcript_employee,
  viewer = "manager",
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
  disabled = false,
}: CompletionMediaPreviewProps) {
  const photoSrc = mediaUrl(photo_path ?? null);
  const videoSrc = mediaUrl(video_path ?? null);
  const audioSrc = mediaUrl(audio_path ?? null);
  const resolvedTranscript =
    viewer === "employee"
      ? audio_transcript_employee ?? audio_transcript
      : audio_transcript;
  if (!photoSrc && !videoSrc && !audioSrc && !resolvedTranscript) return null;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {he.completionMediaAdded}
      </Typography>
      {photoSrc && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {he.taskReferencePhoto}
          </Typography>
          <Box
            component="img"
            src={photoSrc}
            alt={he.taskReferencePhoto}
            sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: 1, display: "block" }}
          />
          {onRemovePhoto && (
            <Button size="small" color="inherit" disabled={disabled} onClick={onRemovePhoto} sx={{ mt: 0.5 }}>
              {he.removeMedia}
            </Button>
          )}
        </Box>
      )}
      {videoSrc && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {he.taskReferenceVideo}
          </Typography>
          <Box
            component="video"
            src={videoSrc}
            controls
            sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1, display: "block" }}
          />
          {onRemoveVideo && (
            <Button size="small" color="inherit" disabled={disabled} onClick={onRemoveVideo} sx={{ mt: 0.5 }}>
              {he.removeMedia}
            </Button>
          )}
        </Box>
      )}
      {audioSrc && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {he.taskReferenceAudio}
          </Typography>
          <Box component="audio" src={audioSrc} controls sx={{ width: "100%", display: "block" }} />
          {onRemoveAudio && (
            <Button size="small" color="inherit" disabled={disabled} onClick={onRemoveAudio} sx={{ mt: 0.5 }}>
              {he.removeMedia}
            </Button>
          )}
        </Box>
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
