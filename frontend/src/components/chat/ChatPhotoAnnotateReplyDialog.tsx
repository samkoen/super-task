import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Alert,
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
import { fetchMediaBlob } from "../../utils/fetchMediaBlob";
import { dialogActionsPbCss } from "../../utils/systemInsets";
import PhotoAnnotationCanvas, {
  type PhotoAnnotationCanvasHandle,
} from "../media/PhotoAnnotationCanvas";
import { exportAnnotatedChatPhoto } from "./ChatPhotoCapture";

export default function ChatPhotoAnnotateReplyDialog({
  photoUrl,
  sending,
  onClose,
  onSend,
}: {
  photoUrl: string | null;
  sending: boolean;
  onClose: () => void;
  onSend: (file: File, caption?: string) => void | Promise<void>;
}) {
  const image = useReplyImageBlob(photoUrl);
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const [caption, setCaption] = useState("");
  const [confirming, setConfirming] = useState(false);
  const busy = sending || confirming || image.loading;
  const open = Boolean(photoUrl);

  useEffect(() => {
    setCaption("");
  }, [photoUrl]);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.photoAnnotateTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1, overflowY: "auto" }}>
        <ReplyImageBody image={image} annotateRef={annotateRef} />
        <ReplyCaptionField
          visible={Boolean(image.blob && !image.error)}
          value={caption}
          disabled={busy}
          onChange={setCaption}
        />
      </DialogContent>
      <ReplyActions
        busy={busy}
        canSend={Boolean(image.blob)}
        onClose={onClose}
        onSend={() => void confirmReply({
          image, annotateRef, caption, sending, confirming, setConfirming, onSend,
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
  onClose,
  onSend,
}: {
  busy: boolean;
  canSend: boolean;
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
        {busy ? he.loading : he.taskChatSend}
      </Button>
    </DialogActions>
  );
}

function useReplyImageBlob(photoUrl: string | null) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photoUrl) {
      setBlob(null);
      setError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    setBlob(null);
    void fetchMediaBlob(photoUrl)
      .then((next) => {
        if (!cancelled) setBlob(next);
      })
      .catch(() => {
        if (!cancelled) setError(he.chatAnnotateReplyLoadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [photoUrl]);

  return { blob, error, loading };
}

function ReplyImageBody({
  image,
  annotateRef,
}: {
  image: ReturnType<typeof useReplyImageBlob>;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle>;
}) {
  if (image.loading) {
    return <CircularProgress size={28} sx={{ alignSelf: "center", my: 2 }} />;
  }
  if (image.error) {
    return <Alert severity="warning">{image.error}</Alert>;
  }
  if (!image.blob) return null;
  return (
    <PhotoAnnotationCanvas
      ref={annotateRef}
      imageBlob={image.blob}
      hint={he.chatAnnotateReplyHint}
    />
  );
}

async function confirmReply(opts: {
  image: ReturnType<typeof useReplyImageBlob>;
  annotateRef: RefObject<PhotoAnnotationCanvasHandle>;
  caption: string;
  sending: boolean;
  confirming: boolean;
  setConfirming: (value: boolean) => void;
  onSend: (file: File, caption?: string) => void | Promise<void>;
}) {
  if (!opts.image.blob || opts.sending || opts.confirming) return;
  opts.setConfirming(true);
  try {
    const file = await exportAnnotatedChatPhoto(opts.image.blob, opts.annotateRef.current);
    await opts.onSend(file, clipChatCaption(opts.caption) || undefined);
  } finally {
    opts.setConfirming(false);
  }
}
