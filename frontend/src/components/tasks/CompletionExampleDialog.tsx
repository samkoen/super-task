import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { he } from "../../i18n/he";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { ReviewableVideo } from "./MarkVideoFrameButton";

export default function CompletionExampleDialog({
  src,
  title,
  kind = "photo",
  onClose,
  onMarkFrame,
}: {
  src: string | null;
  title: string;
  kind?: "photo" | "video";
  onClose: () => void;
  onMarkFrame?: (frameUrl: string) => void;
}) {
  const media = useResolvedMediaSrc(src, Boolean(src && !src.startsWith("blob:")));
  return (
    <Dialog open={Boolean(src)} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
        {title || he.completionEnlargeExample}
        <IconButton aria-label={he.close} onClick={onClose} sx={{ mr: "auto" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <ExampleBody playSrc={media.src} title={title} kind={kind} onMarkFrame={onMarkFrame} />
      </DialogContent>
    </Dialog>
  );
}

function ExampleBody({
  playSrc,
  title,
  kind,
  onMarkFrame,
}: {
  playSrc: string | null;
  title: string;
  kind: "photo" | "video";
  onMarkFrame?: (frameUrl: string) => void;
}) {
  if (playSrc && kind === "video") {
    return <ReviewableVideo src={playSrc} onMarkFrame={onMarkFrame} autoPlay />;
  }
  if (!playSrc) return null;
  return <img src={playSrc} alt={title} style={{ width: "100%", borderRadius: 8, display: "block" }} />;
}
