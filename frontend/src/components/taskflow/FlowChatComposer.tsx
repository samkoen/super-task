import { useState } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import ChatPhotoCapture from "../chat/ChatPhotoCapture";
import cameraIcon from "../../assets/flow1/chat-camera.svg";
import sendIcon from "../../assets/flow1/chat-send.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowShadow, flowText } from "../../styles/flowTokens";
import type { ChatMediaKind } from "../../utils/chatTransport";

type Props = {
  /** « כתבו הודעה על סרטון מקרר ריק... » une fois un sujet choisi. */
  placeholder: string;
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
};

function SendButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={he.flowChatSend}
      data-testid="flow-chat-send"
      disabled={disabled}
      onClick={onClick}
      sx={{ flexShrink: 0, width: 56, height: 56, borderRadius: "50%", bgcolor: flowColor.neutral900, "&.Mui-disabled": { opacity: 0.4 } }}
    >
      <Box component="img" src={sendIcon} alt="" sx={{ width: 20, height: 20, display: "block" }} />
    </ButtonBase>
  );
}

type FieldProps = Pick<Props, "body" | "onBodyChange" | "onSend" | "placeholder"> & { busy: boolean; onCamera: () => void };

function MessageField({ body, onBodyChange, onSend, placeholder, busy, onCamera }: FieldProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, height: 56, display: "flex", alignItems: "center", gap: "8px", px: "20px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral100 }}>
      <InputBase
        fullWidth
        value={body}
        disabled={busy}
        placeholder={placeholder}
        inputProps={{ "aria-label": placeholder, "data-testid": "flow-chat-input", maxLength: 2000 }}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        sx={{ ...flowText.body, p: 0, color: flowColor.neutral900, "& input::placeholder": { color: flowColor.alphaNeutral900_66, opacity: 1 } }}
      />
      <ButtonBase aria-label={he.flowChatCamera} data-testid="flow-chat-camera" disabled={busy} onClick={onCamera} sx={{ flexShrink: 0, "&.Mui-disabled": { opacity: 0.4 } }}>
        <Box component="img" src={cameraIcon} alt="" sx={{ width: 22, height: 22, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}

/** Zone de saisie du chat (écran 12) : champ avec caméra intégrée à gauche, bouton d'envoi rond noir. */
export default function FlowChatComposer(props: Props) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const canSend = Boolean(props.body.trim()) && !props.sending;
  return (
    <Box
      data-testid="flow-chat-composer"
      sx={{ display: "flex", flexDirection: "column", gap: "10px", px: "16px", pt: "16px", pb: "calc(28px + env(safe-area-inset-bottom, 0px))", bgcolor: flowColor.neutral0, borderRadius: "24px 24px 0 0", boxShadow: flowShadow.floating }}
    >
      {props.error ? (
        <Typography role="alert" sx={{ ...flowText.caption, color: "#b3261e" }}>{props.error}</Typography>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MessageField body={props.body} onBodyChange={props.onBodyChange} onSend={() => canSend && props.onSend()} placeholder={props.placeholder} busy={props.sending} onCamera={() => setPhotoOpen(true)} />
        <SendButton disabled={!canSend} onClick={props.onSend} />
      </Box>
      <ChatPhotoCapture
        open={photoOpen}
        uploading={props.sending}
        onClose={() => setPhotoOpen(false)}
        onSend={(file, kind = "photo") => props.onSendMedia(file, kind)}
      />
    </Box>
  );
}
