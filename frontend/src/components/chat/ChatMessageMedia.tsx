import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { chatBubbleCopySx } from "../../utils/chatBubbleSx";
import { mediaUrl } from "../../utils/mediaUrl";
import CompactAudioPlayer from "../media/CompactAudioPlayer";

export default function ChatMessageMedia({
  photoUrl,
  videoUrl,
  audioUrl,
  transcript,
}: {
  photoUrl?: string | null;
  videoUrl?: string | null;
  audioUrl?: string | null;
  transcript?: string | null;
}) {
  const photo = mediaUrl(photoUrl);
  const video = mediaUrl(videoUrl);
  const audio = mediaUrl(audioUrl);
  const note = transcript?.trim();
  if (!photo && !video && !audio && !note) return null;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, width: "100%" }}>
      {photo ? (
        <Box
          component="img"
          src={photo}
          alt={he.taskReferencePhoto}
          sx={{ maxWidth: "100%", maxHeight: 180, borderRadius: 1, display: "block" }}
        />
      ) : null}
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
