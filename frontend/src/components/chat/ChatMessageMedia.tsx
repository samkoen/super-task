import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
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
      <ChatPhoto
        src={photo}
        sourceUrl={photoUrl}
        onAnnotateReply={onAnnotateReply}
      />
      {video ? (
        <Box
          component="video"
          src={video}
          controls
          sx={{ maxWidth: "100%", maxHeight: 200, borderRadius: 1, display: "block" }}
        />
      ) : null}
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

function ChatPhoto({
  src,
  sourceUrl,
  onAnnotateReply,
}: {
  src: string | null;
  sourceUrl?: string | null;
  onAnnotateReply?: (photoUrl: string) => void;
}) {
  if (!src || !sourceUrl) return null;
  const reply = onAnnotateReply ? () => onAnnotateReply(sourceUrl) : undefined;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, width: "100%" }}>
      <Box
        component="img"
        src={src}
        alt={he.taskReferencePhoto}
        onClick={reply}
        sx={{
          maxWidth: "100%",
          maxHeight: 180,
          borderRadius: 1,
          display: "block",
          cursor: reply ? "pointer" : "default",
        }}
      />
      {reply ? (
        <Button size="small" onClick={reply} sx={{ alignSelf: "flex-start", minHeight: 36 }}>
          {he.chatAnnotateReply}
        </Button>
      ) : null}
    </Box>
  );
}
