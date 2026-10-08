import { useEffect, useState } from "react";
import { Button, Dialog, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";

type InboxNote = Awaited<ReturnType<typeof deliveryNoteService.inbox>>[number];

export default function AgrolineNotesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState<InboxNote[]>([]);

  useEffect(() => {
    if (!open) return;
    deliveryNoteService.inbox().then(setNotes).catch(() => setNotes([]));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.agrolineViewNotes}</DialogTitle>
      <DialogContent>
        {notes.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{he.agrolineInboxEmpty}</Typography>
        ) : (
          <NotesTable notes={notes} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function NotesTable({ notes }: { notes: InboxNote[] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{he.agrolineNumber}</TableCell>
          <TableCell>{he.agrolineCustomer}</TableCell>
          <TableCell>{he.deliveryNotePdf}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {notes.map((note) => (
          <TableRow key={note.agroline_number}>
            <TableCell>{note.agroline_number}</TableCell>
            <TableCell>{note.customer_name}</TableCell>
            <TableCell>{note.pdf_url ? <PdfLink url={note.pdf_url} /> : ""}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PdfLink({ url }: { url: string }) {
  return (
    <Button component="a" href={url} target="_blank" rel="noopener" size="small">
      {he.deliveryNotePdf}
    </Button>
  );
}
