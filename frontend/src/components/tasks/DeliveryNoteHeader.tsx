import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import type { DeliveryCheck } from "../../utils/deliveryNote";
import DeliveryPdfButton from "./DeliveryPdfButton";

/** En-tête commun des écrans « teuda » : numéro, client, type, et accès direct au PDF. */
export default function DeliveryNoteHeader({ note }: { note: DeliveryCheck }) {
  const kind = note.kind === "mixed" ? he.deliveryNoteKindMixed : he.deliveryNoteKindFresh;
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
      <Typography variant="subtitle1" fontWeight={800}>
        {he.deliveryNotePdf} {note.agroline_number} · {note.customer_name} · {kind}
      </Typography>
      <DeliveryPdfButton url={note.pdf_url} />
    </Box>
  );
}
