import { Box, Button, Typography } from "@mui/material";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { he } from "../../i18n/he";
import type { DeliveryCheck } from "../../utils/deliveryNote";

/** En-tête commun des écrans « teuda » : numéro, client, type, et accès direct au PDF. */
export default function DeliveryNoteHeader({ note }: { note: DeliveryCheck }) {
  const kind = note.kind === "mixed" ? he.deliveryNoteKindMixed : he.deliveryNoteKindFresh;
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
      <Typography variant="subtitle1" fontWeight={800}>
        {he.deliveryNotePdf} {note.agroline_number} · {note.customer_name} · {kind}
      </Typography>
      {note.pdf_url ? (
        <Button
          component="a"
          href={note.pdf_url}
          target="_blank"
          rel="noopener"
          variant="outlined"
          startIcon={<PictureAsPdfOutlinedIcon />}
          sx={{ minHeight: 48, borderRadius: "14px", fontWeight: 700 }}
        >
          {he.deliveryNotePdf}
        </Button>
      ) : null}
    </Box>
  );
}
