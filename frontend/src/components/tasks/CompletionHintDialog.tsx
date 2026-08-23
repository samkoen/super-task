import { Dialog, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { he } from "../../i18n/he";

export default function CompletionHintDialog({
  title,
  text,
  onClose,
}: {
  title: string;
  text: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
        {title || he.completionHintTitle}
        <IconButton aria-label={he.close} onClick={onClose} sx={{ mr: "auto" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
          {text}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
