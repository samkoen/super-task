import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { he } from "../../i18n/he";
import { CHAT_CAPTION_MAX, clipChatCaption } from "../../utils/chatAnnotateReply";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";

export default function ChatPhotoAnnotateReplyDialog({
  photoUrl,
  sending,
  onClose,
  onSend,
  submitLabel,
  hideCaption = false,
}: {
  photoUrl: string | null;
  sending: boolean;
  onClose: () => void;
  onSend: (file: File, caption?: string) => void | Promise<void>;
  submitLabel?: string;
  hideCaption?: boolean;
}) {
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const [caption, setCaption] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [ready, setReady] = useState(false);
  const busy = sending || confirming;
  const open = Boolean(photoUrl);

  useEffect(() => {
    setCaption("");
    setReady(false);
  }, [photoUrl]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.photoAnnotateTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1, overflowY: "auto" }}>
        {photoUrl ? (
          <PhotoAnnotationCanvas
            ref={annotateRef}
            image={photoUrl}
            hint={he.chatAnnotateReplyHint}
            onReady={() => setReady(true)}
          />
        ) : null}
        <ReplyCaptionField
          visible={!hideCaption && ready}
          value={caption}
          disabled={busy}
          onChange={setCaption}
        />
      </DialogContent>
      <ReplyActions
        busy={busy}
        canSend={ready}
        submitLabel={submitLabel ?? he.taskChatSend}
        onClose={onClose}
        onSend={() => void confirmReply({
          annotateRef, caption: hideCaption ? "" : caption, sending, confirming, setConfirming, onSend,
        })}
      />
    </Dialog>
  );
}

function ReplyCaptionField({
  visible,
  value,
  disabled,
  onChange,
}: {
  visible: boolean;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (!visible) return null;
  return (
    <TextField
      multiline
      minRows={2}
      maxRows={4}
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={he.chatAnnotateReplyCaption}
      disabled={disabled}
      inputProps={{ maxLength: CHAT_CAPTION_MAX, "aria-label": he.chatAnnotateReplyCaption }}
    />
  );
}

function ReplyActions({
  busy,
  canSend,
  submitLabel,
  onClose,
  onSend,
}: {
  busy: boolean;
  canSend: boolean;
  submitLabel: string;
  onClose: () => void;
  onSend: () => void;
}) {
  return (
    <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
      <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
      <Button
        variant="contained"
        disabled={busy || !canSend}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        onClick={onSend}
      >
        {busy ? he.loading : submitLabel}
      </Button>
    </DialogActions>
  );
}

async function confirmReply(opts: {
  annotateRef: RefObject<PhotoAnnotationCanvasHandle | null>;
  caption: string;
  sending: boolean;
  confirming: boolean;
  setConfirming: (value: boolean) => void;
  onSend: (file: File, caption?: string) => void | Promise<void>;
}) {
  if (opts.sending || opts.confirming || !opts.annotateRef.current) return;
  opts.setConfirming(true);
  try {
    const file = await opts.annotateRef.current.exportFile();
    await opts.onSend(file, clipChatCaption(opts.caption) || undefined);
  } finally {
    opts.setConfirming(false);
  }
}
