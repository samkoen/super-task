import { useState } from "react";
import { Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { linesWithOrigin, type DeliveryCheck, type DeliveryLineView } from "../../utils/deliveryNote";

const COLUMN_WIDTHS = ["62%", "38%"];
const gutterSx = { direction: "ltr", scrollbarGutter: "stable" } as const;
const tableSx = { direction: "rtl", tableLayout: "fixed" } as const;

export default function DeliveryOriginList({ note }: { note: DeliveryCheck }) {
  const lines = linesWithOrigin(note.lines);
  const kind = note.kind === "mixed" ? he.deliveryNoteKindMixed : he.deliveryNoteKindFresh;
  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Typography variant="subtitle1" fontWeight={700}>
        {he.deliveryNotePdf} {note.agroline_number} · {note.customer_name} · {kind}
      </Typography>
      {note.pdf_url ? (
        <Button component="a" href={note.pdf_url} target="_blank" rel="noopener" size="small">
          {he.deliveryNotePdf}
        </Button>
      ) : null}
      {lines.length ? <OriginTable lines={lines} /> : <Typography variant="body2">{he.deliveryNoteOriginEmpty}</Typography>}
    </Box>
  );
}

function OriginTable({ lines }: { lines: DeliveryLineView[] }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
      <Box sx={{ ...gutterSx, overflowY: "hidden" }}>
        <Table size="small" sx={tableSx}>
          <ColumnWidths />
          <TableHead>
            <TableRow>
              <TableCell>{he.deliveryNoteColumnProduct}</TableCell>
              <TableCell>{he.deliveryNoteColumnOrigin}</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </Box>
      <TableContainer sx={{ ...gutterSx, maxHeight: 420, overflowY: "auto" }}>
        <Table size="small" sx={tableSx}>
          <ColumnWidths />
          <TableBody>
            {lines.map((line) => (
              <OriginRow key={line.id} line={line} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function ColumnWidths() {
  return (
    <colgroup>
      {COLUMN_WIDTHS.map((width) => (
        <col key={width} style={{ width }} />
      ))}
    </colgroup>
  );
}

function OriginRow({ line }: { line: DeliveryLineView }) {
  return (
    <TableRow>
      <TableCell>
        <Box display="flex" gap={1} alignItems="center">
          <ProductImage line={line} />
          <Typography variant="body2">{line.product_name}</Typography>
        </Box>
      </TableCell>
      <TableCell>{line.origin_name}</TableCell>
    </TableRow>
  );
}

function ProductImage({ line }: { line: DeliveryLineView }) {
  const [hidden, setHidden] = useState(false);
  if (!line.image_url || hidden) return null;
  return (
    <Box
      component="img"
      src={line.image_url}
      alt=""
      onError={() => setHidden(true)}
      sx={{ width: 40, height: 40, objectFit: "contain", flexShrink: 0 }}
    />
  );
}
