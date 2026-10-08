import { Button } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { he } from "../../i18n/he";
import { mediaUrl } from "../../utils/mediaUrl";

/**
 * Ouvre le PDF d'une teuda. Le stockage est privé : l'adresse brute répond « Authorization »,
 * il faut passer par le proxy média de l'application (comme pour les photos).
 */
export default function DeliveryPdfButton({ url }: { url?: string | null }) {
  const href = mediaUrl(url);
  if (!href) return null;
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener"
      variant="outlined"
      startIcon={<PictureAsPdfOutlinedIcon />}
      sx={{ minHeight: 48, borderRadius: "14px", fontWeight: 700, flexShrink: 0 }}
    >
      {he.deliveryNotePdf}
    </Button>
  );
}
