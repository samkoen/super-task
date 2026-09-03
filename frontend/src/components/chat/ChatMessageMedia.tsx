import { Box, Button, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { chatBubbleCopySx } from "../../utils/chatBubbleSx";
import { mediaUrl } from "../../utils/mediaUrl";
import CompactAudioPlayer from "../media/CompactAudioPlayer";

export default function ChatMessageMedia({
  photoUrl,
  videoUrl,
  audioUrl,
  transcript,
  onAnnotateReply,
}: {
  photoUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
  onAnnotateReply?: (photoUrl: string) => void;
}) {
  const photo = mediaUrl(photoUrl);
  const video = mediaUrl(videoUrl);
  const audio = mediaUrl(audioUrl);
  const note = transcript?.trim();
  if (!photo && !video && !audio && !note) return null;
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
      {note ? (
        <Typography variant="body2" sx={chatBubbleCopySx}>
          {note}
        </Typography>
      ) : null}
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
