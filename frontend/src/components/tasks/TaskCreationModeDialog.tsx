import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import EditNoteIcon from "@mui/icons-material/EditNote";
import MicIcon from "@mui/icons-material/Mic";
import { he } from "../../i18n/he";

export type TaskCreationMode = "manual" | "voice" | "gallery";

interface TaskCreationModeDialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSelect: (mode: TaskCreationMode) => void;
}

export default function TaskCreationModeDialog({
  open,
  title,
  onClose,
  onSelect,
}: TaskCreationModeDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {he.taskCreationModeHint}
        </Typography>
        <Button
          variant="outlined"
          size="large"
          startIcon={<EditNoteIcon />}
          onClick={() => onSelect("manual")}
          sx={{ justifyContent: "flex-start" }}
        >
          {he.taskCreationModeManual}
        </Button>
        <Button
          variant="contained"
          size="large"
          startIcon={<MicIcon />}
          onClick={() => onSelect("voice")}
          sx={{ justifyContent: "flex-start" }}
        >
          {he.taskCreationModeVoice}
        </Button>
        <Button
          variant="outlined"
          size="large"
          startIcon={<CollectionsBookmarkIcon />}
          onClick={() => onSelect("gallery")}
          sx={{ justifyContent: "flex-start" }}
        >
          {he.taskCreationModeGallery}
        </Button>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{he.cancel}</Button>
      </DialogActions>
    </Dialog>
  );
}
