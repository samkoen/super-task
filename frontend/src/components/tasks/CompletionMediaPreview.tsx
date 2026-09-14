import { Box, Button, Typography } from "@mui/material";
import CompactAudioPlayer from "../media/CompactAudioPlayer";
import CompletionSlotGrid from "./CompletionSlotGrid";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { displayedAudioTranscript } from "../../utils/displayedAudioTranscript";
import {
  attachmentsFromCompletion,
  mapAttachmentsToSlots,
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
  videosPending?: boolean;
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
  videosPending = false,
}: CompletionMediaPreviewProps) {
  const items = attachmentsFromCompletion({
    completion_attachments: attachments,
    photo_path,
    video_path,
    audio_path,
  });
  const reqs = normalizeRequirements(requirements);
  const hasVisualGuides = visualSlotCount(reqs) > 0;
  const mapped = mapAttachmentsToSlots(reqs, items, { videosPending });
  const hasAudio = items.some((item) => item.kind === "audio") || reqs.some((r) => r.kind === "audio");
  const resolvedTranscript = displayedAudioTranscript(
    viewer === "employee"
      ? audio_transcript_employee ?? audio_transcript
      : audio_transcript,
    { hasAudio, allowFallback: transcriptFallback },
  );
  if (!items.length && !resolvedTranscript && !hasVisualGuides) return null;
  const leftover = hasVisualGuides ? mapped.leftover : [];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Typography variant="subtitle2" color="text.secondary">
        {viewer === "employee" ? he.completionMediaAdded : he.completionMediaFromEmployee}
      </Typography>
      {hasVisualGuides ? (
        <CompletionSlotGrid
          requirements={reqs}
          fills={mapped.fills}
        />
      ) : (
        <LegacyAttachmentList
          items={items}
          disabled={disabled}
          videosPending={videosPending}
          onRemovePhoto={onRemovePhoto}
          onRemoveVideo={onRemoveVideo}
          onRemoveAudio={onRemoveAudio}
        />
      )}
      {leftover.length > 0 && (
        <LegacyAttachmentList
          items={leftover}
          disabled={disabled}
          videosPending={videosPending}
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
  videosPending,
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
}: {
  items: CompletionAttachment[];
  disabled: boolean;
  videosPending: boolean;
  onRemovePhoto?: () => void;
  onRemoveVideo?: () => void;
  onRemoveAudio?: () => void;
}) {
  return (
    <>
      {items.map((item, index) => (
        <LeftoverMediaItem
          key={`${item.kind}-${index}`}
          item={item}
          disabled={disabled}
          videosPending={videosPending}
          onRemovePhoto={onRemovePhoto}
          onRemoveVideo={onRemoveVideo}
          onRemoveAudio={onRemoveAudio}
        />
      ))}
    </>
  );
}

function LeftoverMediaItem({
  item,
  disabled,
  videosPending,
  onRemovePhoto,
  onRemoveVideo,
  onRemoveAudio,
}: {
  item: CompletionAttachment;
  disabled: boolean;
  videosPending: boolean;
  onRemovePhoto?: () => void;
  onRemoveVideo?: () => void;
  onRemoveAudio?: () => void;
}) {
  const remote = Boolean(item.url && !item.url.startsWith("blob:"));
  const resolved = useResolvedMediaSrc(item.url, remote);
  const poster = useResolvedMediaSrc(
    item.poster_url,
    Boolean(item.poster_url && !item.poster_url.startsWith("blob:")),
  );
  if (!resolved.src) return null;
  const onRemove = leftoverRemoveHandler(item.kind, onRemovePhoto, onRemoveVideo, onRemoveAudio);
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {kindLabel(item.kind)}
      </Typography>
      <LeftoverMediaBody item={item} src={resolved.src} posterSrc={poster.src} videosPending={videosPending} />
      {onRemove && (
        <Button size="small" color="inherit" disabled={disabled} onClick={onRemove} sx={{ mt: 0.5 }}>
          {he.removeMedia}
        </Button>
      )}
    </Box>
  );
}

function leftoverRemoveHandler(
  kind: string,
  onRemovePhoto?: () => void,
  onRemoveVideo?: () => void,
  onRemoveAudio?: () => void,
) {
  if (kind === "photo") return onRemovePhoto;
  if (kind === "video") return onRemoveVideo;
  if (kind === "audio") return onRemoveAudio;
  return undefined;
}

function LeftoverMediaBody({
  item,
  src,
  posterSrc,
  videosPending,
}: {
  item: CompletionAttachment;
  src: string;
  posterSrc: string | null;
  videosPending: boolean;
}) {
  if (item.kind === "photo") {
    return (
      <Box
        component="img"
        src={src}
        alt={he.taskReferencePhoto}
        sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: 1, display: "block" }}
      />
    );
  }
  if (item.kind === "video" && videosPending) {
    return (
      <Box sx={{ position: "relative", maxWidth: 240 }}>
        {posterSrc ? (
          <Box
            component="img"
            src={posterSrc}
            alt={he.taskReferenceVideo}
            sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1, display: "block" }}
          />
        ) : (
          <Box sx={{ height: 120, bgcolor: "action.hover", borderRadius: 1 }} />
        )}
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          {he.reviewVideoLoading}
        </Typography>
      </Box>
    );
  }
  if (item.kind === "video") {
    return (
      <Box
        component="video"
        src={src}
        controls
        sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1, display: "block" }}
      />
    );
  }
  return <CompactAudioPlayer src={src} />;
}
