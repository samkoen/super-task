import { Box, CircularProgress, Typography, alpha } from "@mui/material";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { he } from "../../../i18n/he";

export const REJECT_COLOR = "#C62828";

type Props = {
  remark?: string | null;
  /** Image avec les flèches et ronds du menahel (URL serveur ou aperçu local). */
  imageUrl?: string | null;
  label?: string;
  onEnlarge?: (src: string) => void;
};

/** La remarque du menahel sur une sous-tâche : image annotée + texte, bien visibles. */
export default function SlotRemarkView({ remark, imageUrl, label, onEnlarge }: Props) {
  const text = (remark || "").trim();
  if (!text && !imageUrl) return null;
  return (
    <Box
      data-testid="slot-remark"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        p: 1.5,
        borderRadius: "14px",
        border: `1px solid ${alpha(REJECT_COLOR, 0.35)}`,
        bgcolor: alpha(REJECT_COLOR, 0.06),
      }}
    >
      {label ? (
        <Typography sx={{ color: REJECT_COLOR, fontWeight: 800, fontSize: "0.95rem" }}>{label}</Typography>
      ) : null}
      {imageUrl ? <AnnotatedImage url={imageUrl} onEnlarge={onEnlarge} /> : null}
      {text ? (
        <Typography sx={{ fontWeight: 600, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{text}</Typography>
      ) : null}
    </Box>
  );
}

function AnnotatedImage({ url, onEnlarge }: { url: string; onEnlarge?: (src: string) => void }) {
  const media = useResolvedMediaSrc(url, !url.startsWith("blob:"));
  if (!media.src) return <CircularProgress size={24} />;
  return (
    <Box
      component="img"
      src={media.src}
      alt={he.slotRemarkMarkedImage}
      onError={media.onError}
      onClick={onEnlarge ? () => onEnlarge(url) : undefined}
      sx={{
        width: "100%",
        maxHeight: 220,
        objectFit: "contain",
        borderRadius: "10px",
        bgcolor: "common.black",
        cursor: onEnlarge ? "zoom-in" : "default",
        display: "block",
      }}
    />
  );
}
