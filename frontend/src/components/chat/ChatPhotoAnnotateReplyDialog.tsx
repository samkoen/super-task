import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { he } from "../../i18n/he";
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
  onSend: (file: File) => void | Promise<void>;
}) {
  const image = useReplyImageBlob(photoUrl);
  const annotateRef = useRef<PhotoAnnotationCanvasHandle>(null);
  const [confirming, setConfirming] = useState(false);
  const busy = sending || confirming || image.loading;
  const open = Boolean(photoUrl);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" dir="rtl" disableEnforceFocus>
      <DialogTitle>{he.photoAnnotateTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1, overflowY: "auto" }}>
        <ReplyImageBody image={image} annotateRef={annotateRef} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: dialogActionsPbCss(), flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={busy}>{he.cancel}</Button>
        <Button
          variant="contained"
          disabled={busy || !image.blob}
          startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
          onClick={() => void confirmReply({ image, annotateRef, sending, confirming, setConfirming, onSend })}
        >
          {busy ? he.loading : he.taskChatSend}
        </Button>
      </DialogActions>
    </Dialog>
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
  annotateRef: RefObject<PhotoAnnotationCanvasHandle | null>;
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
  annotateRef: RefObject<PhotoAnnotationCanvasHandle | null>;
  sending: boolean;
  confirming: boolean;
  setConfirming: (value: boolean) => void;
  onSend: (file: File) => void | Promise<void>;
}) {
  if (!opts.image.blob || opts.sending || opts.confirming) return;
  opts.setConfirming(true);
  try {
    await opts.onSend(await exportAnnotatedChatPhoto(opts.image.blob, opts.annotateRef.current));
  } finally {
    opts.setConfirming(false);
  }
}
