import { useCallback, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ApiError } from "../../services/api";
import { aiService } from "../../services/aiService";
import { taskService } from "../../services/taskService";
import MediaCaptureActions, { type MediaKind } from "../media/MediaCaptureActions";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

export interface TaskReferenceMediaValue {
  reference_photo_url: string;
  reference_video_url: string;
  reference_audio_url: string;
  /** Fichier local — upload seulement à la soumission du formulaire. */
  pending_photo?: File | null;
  pending_video?: File | null;
  /** Aperçu local (blob:) — le proxy média refuse l’URL Blob tant que la tâche n’est pas sauvée. */
  pending_audio_preview?: string;
}

interface TaskReferenceMediaEditorProps {
  value: TaskReferenceMediaValue;
  onChange: (value: TaskReferenceMediaValue) => void;
  onDescriptionAppend?: (transcript: string) => void;
  disabled?: boolean;
  onError?: (message: string) => void;
}

function revokeIfBlob(url: string | undefined): void {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/** Lecture locale si dispo, sinon proxy — évite un 403 juste après l’upload. */
export function referenceAudioPlaybackSrc(
  value: Pick<TaskReferenceMediaValue, "reference_audio_url" | "pending_audio_preview">,
): string | null {
  if (value.pending_audio_preview) return value.pending_audio_preview;
  return mediaUrl(value.reference_audio_url || null);
}

/** Upload les fichiers locaux et renvoie des URLs serveur prêtes à persister. */
export async function resolveTaskReferenceMedia(
  value: TaskReferenceMediaValue,
): Promise<{
  reference_photo_url?: string;
  reference_video_url?: string;
  reference_audio_url?: string;
}> {
  let photo = value.reference_photo_url || undefined;
  let video = value.reference_video_url || undefined;
  const audio = value.reference_audio_url || undefined;

  if (value.pending_photo) {
    photo = (await taskService.uploadPhoto(value.pending_photo)).url;
  } else if (photo?.startsWith("blob:")) {
    photo = undefined;
  }

  if (value.pending_video) {
    video = (await taskService.uploadVideo(value.pending_video)).url;
  } else if (video?.startsWith("blob:")) {
    video = undefined;
  }

  return {
    reference_photo_url: photo,
    reference_video_url: video,
    reference_audio_url: audio,
  };
}

export default function TaskReferenceMediaEditor({
  value,
  onChange,
  onDescriptionAppend,
  disabled = false,
  onError,
}: TaskReferenceMediaEditorProps) {
  const [uploadingKind, setUploadingKind] = useState<MediaKind | null>(null);
  const [transcribingAudio, setTranscribingAudio] = useState(false);
  const [transcriptionFailed, setTranscriptionFailed] = useState(false);

  const handleCapture = useCallback(
    async (file: File, kind: MediaKind) => {
      if (kind === "photo") {
        revokeIfBlob(value.reference_photo_url);
        onChange({
          ...value,
          reference_photo_url: URL.createObjectURL(file),
          pending_photo: file,
        });
        return;
      }
      if (kind === "video") {
        revokeIfBlob(value.reference_video_url);
        onChange({
          ...value,
          reference_video_url: URL.createObjectURL(file),
          pending_video: file,
        });
        return;
      }

      setUploadingKind("audio");
      try {
        const res = await taskService.uploadAudio(file);
        revokeIfBlob(value.pending_audio_preview);
        setTranscriptionFailed(false);
        onChange({
          ...value,
          reference_audio_url: res.url,
          pending_audio_preview: URL.createObjectURL(file),
        });
        setUploadingKind(null);
        if (onDescriptionAppend) {
          setTranscribingAudio(true);
          try {
            const { transcript } = await aiService.transcribeReferenceAudio(res.url);
            if (transcript.trim()) {
              onDescriptionAppend(transcript);
            } else {
              setTranscriptionFailed(true);
            }
          } catch {
            setTranscriptionFailed(true);
          } finally {
            setTranscribingAudio(false);
          }
        }
      } catch (e) {
        onError?.(e instanceof ApiError ? e.message : he.errorGeneric);
      } finally {
        setUploadingKind(null);
      }
    },
    [onDescriptionAppend, onChange, onError, value],
  );

  const photoSrc = mediaUrl(value.reference_photo_url || null);
  const videoSrc = mediaUrl(value.reference_video_url || null);
  const audioSrc = referenceAudioPlaybackSrc(value);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {he.taskReferenceMediaHint}
      </Typography>
      <MediaCaptureActions
        photoAdded={Boolean(value.reference_photo_url)}
        videoAdded={Boolean(value.reference_video_url)}
        audioAdded={Boolean(value.reference_audio_url)}
        uploadingKind={uploadingKind}
        disabled={disabled || transcribingAudio}
        onCapture={handleCapture}
      />
      {transcribingAudio && (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={18} />
          <Typography variant="caption" color="text.secondary">
            {he.referenceAudioTranscribing}
          </Typography>
        </Box>
      )}
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
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() => {
              revokeIfBlob(value.reference_photo_url);
              onChange({ ...value, reference_photo_url: "", pending_photo: null });
            }}
            sx={{ mt: 0.5 }}
          >
            {he.removeMedia}
          </Button>
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
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() => {
              revokeIfBlob(value.reference_video_url);
              onChange({ ...value, reference_video_url: "", pending_video: null });
            }}
            sx={{ mt: 0.5 }}
          >
            {he.removeMedia}
          </Button>
        </Box>
      )}
      {audioSrc && (
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {he.taskReferenceAudio}
          </Typography>
          <Box component="audio" src={audioSrc} controls sx={{ width: "100%", display: "block" }} />
          {transcriptionFailed && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {he.audioTranscriptionFailed}
            </Typography>
          )}
          <Button
            size="small"
            color="inherit"
            disabled={disabled}
            onClick={() => {
              revokeIfBlob(value.pending_audio_preview);
              setTranscriptionFailed(false);
              onChange({
                ...value,
                reference_audio_url: "",
                pending_audio_preview: undefined,
              });
            }}
            sx={{ mt: 0.5 }}
          >
            {he.removeMedia}
          </Button>
        </Box>
      )}
    </Box>
  );
}
