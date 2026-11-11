import { type Ref } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import ChatMessageMedia from "../chat/ChatMessageMedia";
import linkIcon from "../../assets/flow1/chat-link.svg";
import readIcon from "../../assets/flow1/chat-read.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";
import { chatThreadItems } from "../../utils/chatDay";
import { chatMessageText, chatMessageTranscript, type ChatMessageView } from "../../utils/chatMessageView";
import { formatTime } from "../../utils/dashboardTime";

type Props = {
  messages: ChatMessageView[];
  myId?: string;
  stepTagFor: (index: number | null | undefined) => string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  bottomRef: Ref<HTMLDivElement>;
};

/** « Date Pill » : « היום » centré au-dessus de la première bulle du jour. */
function DatePill({ label }: { label: string }) {
  return (
    <Box
      role="separator"
      aria-label={label}
      data-testid="flow-chat-day"
      sx={{ alignSelf: "center", px: "10px", py: "4px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.alphaNeutral0_70 }}
    >
      <Typography sx={{ ...flowText.caption, color: flowColor.alphaNavy800_60 }}>{label}</Typography>
    </Box>
  );
}

/** « Step Tag » : Soft dans la bulle du manager, Strong dans la mienne. */
function StepTag({ label, mine }: { label: string; mine: boolean }) {
  return (
    <Box
      data-testid="flow-chat-step-tag"
      sx={{ display: "flex", alignItems: "center", gap: "4px", px: "8px", py: "3px", borderRadius: `${flowRadius.full}px`, bgcolor: mine ? flowColor.green300 : flowColor.alphaGreen300_60 }}
    >
      <Box component="img" src={linkIcon} alt="" sx={{ width: 11, height: 11, display: "block" }} />
      <Typography sx={{ ...flowText.caption, color: flowColor.green700, whiteSpace: "nowrap" }}>{label}</Typography>
    </Box>
  );
}

function bubbleSx(mine: boolean) {
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "6px",
    maxWidth: 260,
    px: "14px",
    py: "10px",
    boxSizing: "border-box",
    alignSelf: mine ? "flex-end" : "flex-start",
    color: mine ? flowColor.neutral0 : flowColor.navy800,
    bgcolor: mine ? flowColor.inverse : flowColor.neutral0,
    borderRadius: mine ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
  } as const;
}

function MessageTime({ iso, mine }: { iso: string; mine: boolean }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <Typography sx={{ ...flowText.caption, color: mine ? "rgba(255,255,255,0.7)" : flowColor.alphaNavy800_60 }}>
        {formatTime(iso)}
      </Typography>
      {mine ? <Box component="img" src={readIcon} alt="" sx={{ width: 14, height: 14, display: "block" }} /> : null}
    </Box>
  );
}

function Bubble({ msg, mine, tag }: { msg: ChatMessageView; mine: boolean; tag: string | null }) {
  const text = chatMessageText(msg);
  return (
    <Box data-testid="flow-chat-bubble" data-mine={mine ? "true" : "false"} sx={bubbleSx(mine)}>
      {tag ? <StepTag label={tag} mine={mine} /> : null}
      {text ? (
        <Typography sx={{ ...flowText.body, textAlign: "right", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{text}</Typography>
      ) : null}
      <ChatMessageMedia
        photoUrl={msg.photo_url}
        videoUrl={msg.video_url}
        audioUrl={msg.audio_url}
        fileUrl={msg.file_url}
        fileName={msg.file_name}
        transcript={chatMessageTranscript(msg)}
      />
      <MessageTime iso={msg.created_at} mine={mine} />
    </Box>
  );
}

/** Fil de la tâche (écran 12) : pastille du jour, bulles blanches du manager à droite, bulles sombres de l'oved à gauche. */
export default function FlowChatMessages({ messages, myId, stepTagFor, hasMore, loadingOlder, onLoadOlder, bottomRef }: Props) {
  return (
    <Box data-testid="flow-chat-messages" sx={{ display: "flex", flexDirection: "column", gap: "10px", pt: "16px", px: "16px" }}>
      {hasMore ? (
        <Button type="button" onClick={onLoadOlder} disabled={loadingOlder} sx={{ ...flowText.label, color: flowColor.green700 }}>
          {loadingOlder ? <CircularProgress size={16} /> : he.chatLoadOlder}
        </Button>
      ) : null}
      {chatThreadItems(messages).map((item) =>
        item.kind === "day" ? (
          <DatePill key={`day-${item.day}`} label={item.label} />
        ) : (
          <Bubble
            key={item.message.id}
            msg={item.message}
            mine={Boolean(myId && item.message.sender_user_id === myId)}
            tag={stepTagFor(item.message.slot_index)}
          />
        ),
      )}
      <div ref={bottomRef} />
    </Box>
  );
}
