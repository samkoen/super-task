import { useEffect, useState } from "react";
import { Box, CircularProgress, Dialog, DialogContent, Typography } from "@mui/material";
import DeliveryPdfButton from "./DeliveryPdfButton";
import { deliveryNoteService } from "../../services/deliveryNoteService";
import { he } from "../../i18n/he";
import { employeeCardSx } from "../../styles/employeeUi";
import AppDialogTitle from "../ui/AppDialogTitle";

type InboxNote = Awaited<ReturnType<typeof deliveryNoteService.inbox>>[number];

export default function AgrolineNotesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [notes, setNotes] = useState<InboxNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    deliveryNoteService
      .inbox()
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <AppDialogTitle title={he.agrolineViewNotes} onClose={onClose} />
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : notes.length === 0 ? (
          <Box textAlign="center" py={3}>
            <Typography fontWeight={700}>{he.agrolineInboxEmpty}</Typography>
            <Typography color="text.secondary" mt={0.5}>{he.deliveryNoteNotesEmptyHint}</Typography>
          </Box>
        ) : (
          <>
            <Typography color="text.secondary">{he.agrolineNotesCount(notes.length)}</Typography>
            {notes.map((note) => (
              <NoteCard key={note.agroline_number} note={note} />
            ))}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NoteCard({ note }: { note: InboxNote }) {
  const lineCount = note.lines?.length ?? 0;
  return (
    <Box sx={{ ...employeeCardSx, p: 2, display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box flex={1} minWidth={0}>
        <Typography fontWeight={800}>{note.customer_name}</Typography>
        <Typography color="text.secondary" variant="body2">
          {he.agrolineNumber} {note.agroline_number}
          {lineCount ? ` · ${he.deliveryNoteLinesCount(lineCount)}` : ""}
        </Typography>
      </Box>
      <DeliveryPdfButton url={note.pdf_url} />
    </Box>
  );
}
