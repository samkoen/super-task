import { useState } from "react";
import { Box, ButtonBase, Dialog, Typography } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";

/**
 * Image figée de la prise refusée, avec les ronds et flèches du menahel :
 * vignette sous la remarque, plein écran au toucher pour bien voir ce qu'il faut refaire.
 */
export default function FlowRemarkImage({ url }: { url: string }) {
  const [open, setOpen] = useState(false);
  const { src } = useResolvedMediaSrc(url, true);
  if (!src) return null;
  return (
    <>
      <ButtonBase
        data-testid="flow-card-remark-image"
        aria-label={he.flowCardRemarkImageOpen}
        onClick={() => setOpen(true)}
        sx={{ mt: "8px", display: "flex", flexDirection: "column", alignItems: "stretch", gap: "4px", width: "100%" }}
      >
        <Box component="img" src={src} alt={he.flowCardRemarkImage} sx={{ width: "100%", maxHeight: 140, objectFit: "contain", borderRadius: `${flowRadius.sm}px`, bgcolor: flowColor.neutral900, border: "2px solid #b3261e" }} />
        <Typography sx={{ ...flowText.label, color: "#b3261e", textAlign: "right" }}>{he.flowCardRemarkImage}</Typography>
      </ButtonBase>
      <Dialog open={open} onClose={() => setOpen(false)} fullScreen PaperProps={{ sx: { bgcolor: "#000", justifyContent: "center" } }}>
        <ButtonBase aria-label={he.flowCardRemarkImageClose} data-testid="flow-card-remark-image-close" onClick={() => setOpen(false)} sx={{ position: "absolute", top: 16, left: 16, width: 48, height: 48, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.15)" }}>
          <CloseRoundedIcon sx={{ color: "#fff" }} />
        </ButtonBase>
        <Box component="img" src={src} alt={he.flowCardRemarkImage} sx={{ width: "100%", maxHeight: "100%", objectFit: "contain" }} />
      </Dialog>
    </>
  );
}
