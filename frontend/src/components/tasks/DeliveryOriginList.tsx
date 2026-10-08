import { Box, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { employeeCardSx } from "../../styles/employeeUi";
import { linesWithOrigin, type DeliveryCheck, type DeliveryLineView } from "../../utils/deliveryNote";
import DeliveryNoteHeader from "./DeliveryNoteHeader";
import DeliveryProductImage from "./DeliveryProductImage";

/** Tâche « pays d'origine » : liste en lecture seule des produits qui ont un pays d'origine. */
export default function DeliveryOriginList({ note }: { note: DeliveryCheck }) {
  const lines = linesWithOrigin(note.lines);
  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <DeliveryNoteHeader note={note} />
      {lines.length ? (
        lines.map((line) => <OriginCard key={line.id} line={line} />)
      ) : (
        <Typography color="text.secondary">{he.deliveryNoteOriginEmpty}</Typography>
      )}
    </Box>
  );
}

function OriginCard({ line }: { line: DeliveryLineView }) {
  return (
    <Box sx={{ ...employeeCardSx, p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
      <DeliveryProductImage url={line.image_url} />
      <Box minWidth={0}>
        <Typography fontWeight={800} sx={{ fontSize: "1.1rem" }}>{line.product_name}</Typography>
        <Typography color="text.secondary">
          {he.deliveryNoteColumnOrigin}: {line.origin_name}
        </Typography>
      </Box>
    </Box>
  );
}
