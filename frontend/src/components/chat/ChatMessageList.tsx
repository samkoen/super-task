import { type Ref } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { formatTime } from "../../utils/dashboardTime";
import { canAnnotateChatReply } from "../../utils/chatAnnotateReply";
import { chatThreadItems } from "../../utils/chatDay";
import {
  chatMessageListSx,
  chatMessageText,
  chatMessageTranscript,
  isEmployeeChatMessage,
  type ChatMessageView,
} from "../../utils/chatMessageView";
import { chatBubbleCopySx, chatBubbleMetaSx, chatBubbleSx, isChatAudioOnly } from "../../utils/chatBubbleSx";
import ChatMessageMedia from "./ChatMessageMedia";

export default function ChatMessageList({
  messages,
  myId,
  hasMore,
  loadingOlder,
  onLoadOlder,
  bottomRef,
  composeEnabled = true,
  onAnnotateReply,
  layout = "fill",
  compact = false,
  highlightEmployee = false,
}: {
  messages: ChatMessageView[];
  myId?: string;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  bottomRef: Ref<HTMLDivElement>;
  composeEnabled?: boolean;
  onAnnotateReply?: (photoUrl: string) => void;
  layout?: "fill" | "bounded";
  compact?: boolean;
  highlightEmployee?: boolean;
}) {
  return (
    <Box sx={chatMessageListSx(layout, compact)}>
      {hasMore && (
        <Button type="button" size="small" onClick={onLoadOlder} disabled={loadingOlder}>
          {loadingOlder ? <CircularProgress size={16} /> : he.chatLoadOlder}
        </Button>
      )}
      {chatThreadItems(messages).map((item) =>
        item.kind === "day" ? (
          <ChatDayChip key={`day-${item.day}`} label={item.label} />
        ) : (
          <ChatMessageBubble
            key={item.message.id}
            msg={item.message}
            myId={myId}
            composeEnabled={composeEnabled}
            onAnnotateReply={onAnnotateReply}
            highlightEmployee={highlightEmployee}
          />
        ),
      )}
      <div ref={bottomRef} />
    </Box>
  );
}

function ChatDayChip({ label }: { label: string }) {
  return (
    <Box
      role="separator"
      aria-label={label}
      alignSelf="center"
      px={1.25}
      py={0.25}
      borderRadius={2}
      bgcolor="background.paper"
      boxShadow="0 1px 1px rgba(0,0,0,0.08)"
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
    </Box>
  );
}

function ChatMessageBubble({
  msg,
  myId,
  composeEnabled,
  onAnnotateReply,
  highlightEmployee,
}: {
  msg: ChatMessageView;
  myId?: string;
  composeEnabled: boolean;
  onAnnotateReply?: (photoUrl: string) => void;
  highlightEmployee: boolean;
}) {
  const mine = Boolean(myId && msg.sender_user_id === myId);
  const fromEmployee = highlightEmployee && isEmployeeChatMessage(msg, mine);
  const text = chatMessageText(msg);
  return (
    <Box sx={chatBubbleSx({
      mine,
      fromEmployee,
      audioOnly: isChatAudioOnly({
        text,
        photoUrl: msg.photo_url,
        videoUrl: msg.video_url,
        audioUrl: msg.audio_url,
      }),
    })}>
      <Typography variant="caption" sx={chatBubbleMetaSx} display="block">
        {msg.sender_name || "—"} · {formatTime(msg.created_at)}
      </Typography>
      {text ? (
        <Typography variant="body2" fontWeight={fromEmployee && !mine ? 600 : 400} sx={chatBubbleCopySx}>
          {text}
        </Typography>
      ) : null}
      <ChatMessageMedia
        photoUrl={msg.photo_url}
        videoUrl={msg.video_url}
        audioUrl={msg.audio_url}
        fileUrl={msg.file_url}
        fileName={msg.file_name}
        transcript={chatMessageTranscript(msg)}
        onAnnotateReply={
          canAnnotateChatReply(composeEnabled, mine) ? onAnnotateReply : undefined
        }
      />
    </Box>
  );
}
