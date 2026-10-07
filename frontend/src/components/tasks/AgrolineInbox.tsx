import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";
import { lineProductLabel } from "../../utils/deliveryNote";

type InboxNote = Awaited<ReturnType<typeof deliveryNoteService.inbox>>[number];

function productLabel(note: InboxNote): string {
  return note.lines.map((line) => `${lineProductLabel(line)} ${line.quantity} ${line.unit}`).join(" · ");
}

export default function AgrolineInbox({ reloadKey }: { reloadKey: number }) {
  const [notes, setNotes] = useState<InboxNote[]>([]);

  useEffect(() => {
    deliveryNoteService.inbox().then(setNotes).catch(() => setNotes([]));
  }, [reloadKey]);

  return (
    <>
      <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{he.agrolineInboxTitle}</Typography>
      {notes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{he.agrolineInboxEmpty}</Typography>
      ) : (
        <InboxTable notes={notes} />
      )}
    </>
  );
}

function InboxTable({ notes }: { notes: InboxNote[] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{he.agrolineNumber}</TableCell>
          <TableCell>{he.agrolineCustomer}</TableCell>
          <TableCell>{he.agrolineProducts}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.agroline_number}>
            <TableCell>{note.agroline_number}</TableCell>
            <TableCell>{note.customer_name}</TableCell>
            <TableCell>{productLabel(note)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
