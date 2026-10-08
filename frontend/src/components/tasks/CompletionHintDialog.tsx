import { Dialog, DialogContent, Typography } from "@mui/material";
import AppDialogTitle from "../ui/AppDialogTitle";
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
      <AppDialogTitle title={title || he.completionHintTitle} onClose={onClose} />
      <DialogContent>
        <Typography sx={{ whiteSpace: "pre-wrap", fontSize: "1.1rem", lineHeight: 1.7, pb: 1 }}>
          {text}
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
