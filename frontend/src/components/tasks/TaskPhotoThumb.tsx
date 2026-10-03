import { useEffect, useState } from "react";
import { Box, Dialog, DialogContent, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import { he } from "../../i18n/he";
import { taskCardBackgroundUrl } from "../../utils/taskCardBackground";

function usePhotoReady(photoBg: string | null): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!photoBg) {
      setReady(false);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setReady(true);
    };
    img.onerror = () => {
      if (!cancelled) setReady(false);
    };
    img.src = photoBg;
    return () => {
      cancelled = true;
    };
  }, [photoBg]);
  return ready;
}

function PhotoLightbox({
  open,
  photoBg,
  onClose,
}: {
  open: boolean;
  photoBg: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open && Boolean(photoBg)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{ sx: { bgcolor: "#0f172a", backgroundImage: "none", m: 1 } }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 0.5 }}>
        <IconButton aria-label={he.close} onClick={onClose} sx={{ color: "#fff" }}>
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ pt: 0, pb: 2, display: "flex", justifyContent: "center" }}>
        {photoBg && (
          <Box
            component="img"
            src={photoBg}
            alt={he.taskReferencePhoto}
            sx={{ maxWidth: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 1 }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TaskPhotoThumbProps {
  photoUrl?: string | null;
  title: string;
  accent: string;
  height: number;
}

/** Mini photo : seul l’icône zoom capture le clic, le reste du carré remonte au parent. */
export default function TaskPhotoThumb({ photoUrl, title, accent, height }: TaskPhotoThumbProps) {
  const photoBg = taskCardBackgroundUrl(photoUrl);
  const ready = usePhotoReady(photoBg);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const showPhoto = Boolean(photoBg && ready);
  return (
    <>
      <Box sx={{ height, position: "relative", overflow: "hidden" }}>
        {showPhoto ? (
          <LoadedPhoto photoBg={photoBg!} onZoom={() => setLightboxOpen(true)} />
        ) : (
          <Box sx={{ height: "100%", display: "grid", placeItems: "center" }}>
            <Typography variant="h6" fontWeight={800} sx={{ color: accent, opacity: 0.35 }}>
              {title.trim()[0]?.toUpperCase() ?? "?"}
            </Typography>
          </Box>
        )}
      </Box>
      <PhotoLightbox open={lightboxOpen} photoBg={photoBg} onClose={() => setLightboxOpen(false)} />
    </>
  );
}

function PhotoFill({ photoBg }: { photoBg: string }) {
  return (
    <>
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${photoBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(18px)",
          transform: "scale(1.12)",
          opacity: 0.55,
          pointerEvents: "none",
        }}
      />
      <Box
        component="img"
        src={photoBg}
        alt=""
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: "100%",
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </>
  );
}

function ZoomPhotoButton({ onZoom }: { onZoom: () => void }) {
  return (
    <Box
      component="button"
      type="button"
      aria-label={he.taskPhotoEnlarge}
      onClick={(event) => {
        event.stopPropagation();
        onZoom();
      }}
      sx={{
        position: "absolute",
        zIndex: 2,
        insetInlineEnd: 2,
        bottom: 2,
        width: 28,
        height: 28,
        p: 0,
        border: 0,
        borderRadius: 1,
        cursor: "zoom-in",
        color: "#fff",
        bgcolor: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <ZoomOutMapIcon sx={{ fontSize: 16 }} />
    </Box>
  );
}

function LoadedPhoto({ photoBg, onZoom }: { photoBg: string; onZoom: () => void }) {
  return (
    <>
      <PhotoFill photoBg={photoBg} />
      <ZoomPhotoButton onZoom={onZoom} />
    </>
  );
}
