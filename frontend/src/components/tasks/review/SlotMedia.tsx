import type { ReactNode } from "react";
import { Box, CircularProgress, IconButton, Typography } from "@mui/material";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CompactAudioPlayer from "../../media/CompactAudioPlayer";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { useVideoPoster } from "../../../hooks/useVideoPoster";
import { he } from "../../../i18n/he";
import type { CompletionAttachment } from "../../../utils/completionMedia";

export const SLOT_MEDIA_HEIGHT = 200;

type Props = {
  attachment: CompletionAttachment;
  title: string;
  /** Vidéo encore en cours de chargement côté serveur. */
  videoPending?: boolean;
  onEnlarge?: (src: string, kind: "photo" | "video") => void;
};

/** Ce que l'oved a rendu pour une sous-tâche : photo, vidéo (lecture agrandie), audio ou message. */
export default function SlotMedia({ attachment, title, videoPending = false, onEnlarge }: Props) {
  if (attachment.kind === "message") {
    return (
      <Box sx={{ p: 1.5, borderRadius: "14px", bgcolor: "action.hover" }}>
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {attachment.text}
        </Typography>
      </Box>
    );
  }
  if (attachment.kind === "audio") return <AudioMedia url={attachment.url} />;
  if (attachment.kind === "video") {
    return <VideoMedia attachment={attachment} title={title} pending={videoPending} onEnlarge={onEnlarge} />;
  }
  return <PhotoMedia url={attachment.url} title={title} onEnlarge={onEnlarge} />;
}

const frameSx = {
  position: "relative",
  width: "100%",
  height: SLOT_MEDIA_HEIGHT,
  borderRadius: "14px",
  overflow: "hidden",
  bgcolor: "action.hover",
} as const;

function PhotoMedia({ url, title, onEnlarge }: { url?: string; title: string; onEnlarge?: Props["onEnlarge"] }) {
  const media = useResolvedMediaSrc(url, true);
  return (
    <Box sx={frameSx}>
      {media.src ? (
        <Box
          component="img"
          src={media.src}
          alt={title}
          onError={media.onError}
          onClick={url && onEnlarge ? () => onEnlarge(url, "photo") : undefined}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", cursor: onEnlarge ? "zoom-in" : "default" }}
        />
      ) : (
        <Centered><CircularProgress size={28} /></Centered>
      )}
    </Box>
  );
}

function VideoMedia({
  attachment,
  title,
  pending,
  onEnlarge,
}: {
  attachment: CompletionAttachment;
  title: string;
  pending: boolean;
  onEnlarge?: Props["onEnlarge"];
}) {
  const media = useResolvedMediaSrc(attachment.url, true);
  const posterMedia = useResolvedMediaSrc(attachment.poster_url, Boolean(attachment.poster_url));
  const captured = useVideoPoster(pending || posterMedia.src ? null : media.src);
  const poster = posterMedia.src || captured;
  const canPlay = Boolean(attachment.url && media.src && !pending);
  return (
    <Box sx={frameSx}>
      {poster ? (
        <Box component="img" src={poster} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {pending ? (
        <Centered>
          <Typography variant="caption">{he.reviewVideoLoading}</Typography>
        </Centered>
      ) : null}
      {canPlay ? (
        <Centered>
          <IconButton
            aria-label={he.completionPlayVideo}
            onClick={() => onEnlarge?.(attachment.url as string, "video")}
            sx={{ width: 64, height: 64, bgcolor: "rgba(0,0,0,0.55)", color: "#fff", "&:hover": { bgcolor: "rgba(0,0,0,0.7)" } }}
          >
            <PlayArrowRoundedIcon fontSize="large" />
          </IconButton>
        </Centered>
      ) : null}
    </Box>
  );
}

function AudioMedia({ url }: { url?: string }) {
  const media = useResolvedMediaSrc(url, true);
  if (!media.src) return <CircularProgress size={24} />;
  return <CompactAudioPlayer src={media.src} />;
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "text.secondary" }}>
      {children}
    </Box>
  );
}
