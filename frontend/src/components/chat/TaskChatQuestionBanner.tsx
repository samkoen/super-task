import { Alert, Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import { canAnnotateChatReply } from "../../utils/chatAnnotateReply";
import { chatMessageText, type ChatMessageView } from "../../utils/chatMessageView";
import ChatMessageMedia from "./ChatMessageMedia";

export default function TaskChatQuestionBanner({
  message,
  composeEnabled,
  onAnnotateReply,
}: {
  message: ChatMessageView;
  composeEnabled: boolean;
  onAnnotateReply: (photoUrl: string) => void;
}) {
  const text = chatMessageText(message) || message.display_audio_transcript || he.taskChatMediaOnly;
  const hasMedia = Boolean(
    message.photo_url || message.video_url || message.audio_url || message.file_url,
  );
  return (
    <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
      <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>
        {he.taskChatEmployeeQuestion}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", color: "text.primary" }}>
        {text}
      </Typography>
      {hasMedia && (
        <Box mt={1}>
          <ChatMessageMedia
            photoUrl={message.photo_url}
            videoUrl={message.video_url}
            audioUrl={message.audio_url}
            fileUrl={message.file_url}
            fileName={message.file_name}
            onAnnotateReply={
              canAnnotateChatReply(composeEnabled, false) ? onAnnotateReply : undefined
            }
          />
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
        {message.sender_name || "—"} · {formatTime(message.created_at)}
      </Typography>
    </Alert>
  );
}
