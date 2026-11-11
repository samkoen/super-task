import { useState } from "react";
import { Box, ButtonBase, InputBase, Typography } from "@mui/material";
import ChatPhotoCapture from "../chat/ChatPhotoCapture";
import cameraIcon from "../../assets/flow1/chat-camera.svg";
import sendIcon from "../../assets/flow1/chat-send.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowShadow, flowText } from "../../styles/flowTokens";
import type { ChatMediaKind } from "../../utils/chatTransport";
import type { StepChoice } from "../../utils/flowChat";

type Props = {
  choices: StepChoice[];
  selected: number | null;
  onSelect: (index: number | null) => void;
  body: string;
  onBodyChange: (value: string) => void;
  sending: boolean;
  error?: string;
  onSend: () => void;
  onSendMedia: (file: File, kind: ChatMediaKind) => void | Promise<void>;
};

/** « Step Chip » : Selected = task/2 + bordure success, Default = neutral/100. */
function StepChip({ choice, active, onSelect }: { choice: StepChoice; active: boolean; onSelect: () => void }) {
  return (
    <ButtonBase
      data-testid="flow-chat-choice"
      aria-pressed={active}
      onClick={onSelect}
      sx={{
        ...flowText.label,
        flexShrink: 0,
        px: "12px",
        py: "7px",
        borderRadius: `${flowRadius.full}px`,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
        color: active ? flowColor.green700 : flowColor.navy800,
        bgcolor: active ? flowColor.green300 : flowColor.neutral100,
        border: active ? `1.5px solid ${flowColor.green700}` : "1.5px solid transparent",
      }}
    >
      {choice.label}
    </ButtonBase>
  );
}

function StepChips({ choices, selected, onSelect }: Pick<Props, "choices" | "selected" | "onSelect">) {
  if (choices.length <= 1) return null;
  return (
    <>
      <Typography sx={{ ...flowText.caption, color: flowColor.alphaNavy800_60 }}>{he.flowChatWhichStep}</Typography>
      <Box data-testid="flow-chat-picker" role="group" aria-label={he.flowChatWhichStep} sx={{ display: "flex", gap: "6px", overflowX: "auto", flexShrink: 0, "&::-webkit-scrollbar": { display: "none" } }}>
        {choices.map((choice) => (
          <StepChip key={choice.index ?? "general"} choice={choice} active={choice.index === selected} onSelect={() => onSelect(choice.index)} />
        ))}
      </Box>
    </>
  );
}

function SendButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <ButtonBase
      aria-label={he.flowChatSend}
      data-testid="flow-chat-send"
      disabled={disabled}
      onClick={onClick}
      sx={{ flexShrink: 0, width: 44, height: 44, borderRadius: "50%", bgcolor: flowColor.inverse, "&.Mui-disabled": { opacity: 0.4 } }}
    >
      <Box component="img" src={sendIcon} alt="" sx={{ width: 18, height: 18, display: "block" }} />
    </ButtonBase>
  );
}

type FieldProps = Pick<Props, "body" | "onBodyChange" | "onSend"> & { busy: boolean; onCamera: () => void };

function MessageField({ body, onBodyChange, onSend, busy, onCamera }: FieldProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: "8px", px: "14px", py: "12px", borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral100 }}>
      <InputBase
        fullWidth
        value={body}
        disabled={busy}
        placeholder={he.flowChatPlaceholder}
        inputProps={{ "aria-label": he.flowChatPlaceholder, "data-testid": "flow-chat-input", maxLength: 2000 }}
        onChange={(event) => onBodyChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
        sx={{ ...flowText.body, p: 0, color: flowColor.navy800, "& input::placeholder": { color: flowColor.alphaNavy800_60, opacity: 1 } }}
      />
      <ButtonBase aria-label={he.flowChatCamera} data-testid="flow-chat-camera" disabled={busy} onClick={onCamera} sx={{ flexShrink: 0, "&.Mui-disabled": { opacity: 0.4 } }}>
        <Box component="img" src={cameraIcon} alt="" sx={{ width: 20, height: 20, display: "block" }} />
      </ButtonBase>
    </Box>
  );
}

/** « Chat Composer » : question « על איזה שלב ? », puces d'étapes, champ avec caméra et bouton d'envoi. */
export default function FlowChatComposer(props: Props) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const canSend = Boolean(props.body.trim()) && !props.sending;
  return (
    <Box
      data-testid="flow-chat-composer"
      sx={{ display: "flex", flexDirection: "column", gap: "10px", px: "16px", pt: "12px", pb: "calc(28px + env(safe-area-inset-bottom, 0px))", bgcolor: flowColor.neutral0, borderRadius: "24px 24px 0 0", boxShadow: flowShadow.floating }}
    >
      <StepChips choices={props.choices} selected={props.selected} onSelect={props.onSelect} />
      {props.error ? (
        <Typography role="alert" sx={{ ...flowText.caption, color: "#b3261e" }}>{props.error}</Typography>
      ) : null}
      <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <MessageField body={props.body} onBodyChange={props.onBodyChange} onSend={() => canSend && props.onSend()} busy={props.sending} onCamera={() => setPhotoOpen(true)} />
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
