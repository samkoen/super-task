import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { chatBubbleCopySx } from "../../utils/chatBubbleSx";
import { chatFileLabel } from "../../utils/chatFile";
import { mediaUrl } from "../../utils/mediaUrl";
import CompactAudioPlayer from "../media/CompactAudioPlayer";

export default function ChatMessageMedia({
  photoUrl,
  videoUrl,
  audioUrl,
  fileUrl,
  fileName,
  transcript,
  onAnnotateReply,
}: {
  photoUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  transcript?: string | null;
  onAnnotateReply?: (photoUrl: string) => void;
}) {
  const photo = mediaUrl(photoUrl);
  const video = mediaUrl(videoUrl);
  const audio = mediaUrl(audioUrl);
  const file = mediaUrl(fileUrl);
  const note = transcript?.trim();
  if (!photo && !video && !audio && !file && !note) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, width: "100%" }}>
      <ChatPhoto sourceUrl={photoUrl} onAnnotateReply={onAnnotateReply} />
      <ChatVideo sourceUrl={videoUrl} />
      {audio ? <CompactAudioPlayer src={audio} /> : null}
      <ChatFileCard href={file} name={fileName} />
      {note ? (
        <Typography variant="body2" sx={chatBubbleCopySx}>
          {note}
        </Typography>
      ) : null}
    </Box>
  );
}

function ChatFileCard({ href, name }: { href: string | null; name?: string | null }) {
  if (!href) return null;
  const label = chatFileLabel(name);
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      download={label}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1,
        py: 0.75,
        borderRadius: 1,
        bgcolor: "action.hover",
        color: "inherit",
        textDecoration: "none",
        maxWidth: "100%",
      }}
    >
      <InsertDriveFileOutlinedIcon fontSize="small" />
      <Box minWidth={0}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {label}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
          {he.chatFileOpen}
        </Typography>
      </Box>
    </Box>
  );
}

function ChatVideo({ sourceUrl }: { sourceUrl?: string | null }) {
  const media = useResolvedMediaSrc(sourceUrl);
  if (!sourceUrl || !media.src) return null;
  return (
    <PaintedMedia src={media.src} failed={media.failed} onError={media.onError} kind="video" />
  );
}

function ChatPhoto({
  sourceUrl,
  onAnnotateReply,
}: {
  sourceUrl?: string | null;
  onAnnotateReply?: (photoUrl: string) => void;
}) {
  const media = useResolvedMediaSrc(sourceUrl);
  if (!sourceUrl) return null;
  const reply = onAnnotateReply ? () => onAnnotateReply(sourceUrl) : undefined;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: "100%" }}>
      {media.failed ? (
        <ChatMediaFailed />
      ) : media.src ? (
        <PaintedMedia src={media.src} failed={media.failed} onError={media.onError} kind="photo" onClick={reply} />
      ) : (
        <ChatMediaPending />
      )}
      {reply ? (
        <Button size="small" onClick={reply} sx={{ alignSelf: "flex-start", minHeight: 36 }}>
          {he.chatAnnotateReply}
        </Button>
      ) : null}
    </Box>
  );
}

function PaintedMedia({
  src,
  failed,
  onError,
  kind,
  onClick,
}: {
  src: string;
  failed: boolean;
  onError: () => void;
  kind: "photo" | "video";
  onClick?: () => void;
}) {
  const [painted, setPainted] = useState(false);
  useEffect(() => {
    setPainted(false);
  }, [src]);
  if (failed) return <ChatMediaFailed />;
  return (
    <>
      {painted ? null : <ChatMediaPending />}
      <Box
        component={kind === "photo" ? "img" : "video"}
        src={src}
        alt={kind === "photo" ? he.taskReferencePhoto : undefined}
        controls={kind === "video" ? true : undefined}
        onLoad={kind === "photo" ? () => setPainted(true) : undefined}
        onLoadedData={kind === "video" ? () => setPainted(true) : undefined}
        onError={onError}
        onClick={onClick}
        sx={{
          maxWidth: "100%",
          maxHeight: kind === "photo" ? 180 : 200,
          borderRadius: 1,
          display: painted ? "block" : "none",
          cursor: onClick ? "pointer" : "default",
        }}
      />
    </>
  );
}

function ChatMediaPending() {
  return (
    <Box
      aria-label={he.loading}
      sx={{
        minHeight: 120,
        borderRadius: 1,
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CircularProgress size={22} />
    </Box>
  );
}

function ChatMediaFailed() {
  return (
    <Box
      aria-label={he.chatMediaLoadError}
      sx={{
        minHeight: 72,
        borderRadius: 1,
        bgcolor: "action.hover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 1,
      }}
    >
      <Typography variant="caption">{he.chatMediaLoadError}</Typography>
    </Box>
  );
}
