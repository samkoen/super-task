import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { ApiError } from "../../services/api";
import { taskService, type TaskOccurrence } from "../../services/taskService";
import CompletionMediaPreview from "./CompletionMediaPreview";
import { he } from "../../i18n/he";

interface TaskCompletionReviewDialogProps {
  task: TaskOccurrence | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

export default function TaskCompletionReviewDialog({
  task,
  onClose,
  onDone,
}: TaskCompletionReviewDialogProps) {
  const [rejectionNote, setRejectionNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const completion = task?.completion;
  const open = Boolean(task);

  const handleClose = () => {
    if (saving) return;
    setRejectionNote("");
    setError("");
    onClose();
  };

  const handleApprove = async () => {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      await taskService.approve(task.id);
      onDone(he.taskApprovedSuccess);
      handleClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      await taskService.reopen(task.id, {
        rejection_note: rejectionNote.trim() || undefined,
      });
      onDone(he.taskReopenedSuccess);
      handleClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.taskReviewTitle}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        {task && (
          <Typography variant="subtitle1" fontWeight={700}>
            {task.title}
          </Typography>
        )}
        {completion?.note && (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block">
              {he.note}
            </Typography>
            <Typography variant="body2">{completion.note}</Typography>
          </Box>
        )}
        {completion && (
          <CompletionMediaPreview
            photo_path={completion.photo_path}
            video_path={completion.video_path}
            audio_path={completion.audio_path}
            audio_transcript={completion.audio_transcript}
          />
        )}
        <TextField
          label={he.taskReopenNote}
          value={rejectionNote}
          onChange={(e) => setRejectionNote(e.target.value)}
          fullWidth
          multiline
          rows={2}
          placeholder={he.taskReopenNoteHint}
        />
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>
          {he.cancel}
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={() => void handleReopen()}
          disabled={saving}
        >
          {saving ? <CircularProgress size={22} color="inherit" /> : he.taskReopen}
        </Button>
        <Button variant="contained" color="success" onClick={() => void handleApprove()} disabled={saving}>
          {saving ? <CircularProgress size={22} color="inherit" /> : he.taskApproveClose}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
