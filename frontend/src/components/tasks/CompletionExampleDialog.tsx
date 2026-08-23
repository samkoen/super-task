import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { he } from "../../i18n/he";

export default function CompletionExampleDialog({
  src,
  title,
  onClose,
}: {
  src: string | null;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={Boolean(src)} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, pr: 1 }}>
        {title || he.completionEnlargeExample}
        <IconButton aria-label={he.close} onClick={onClose} sx={{ mr: "auto" }} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {src && (
          <img
            src={src}
            alt={title}
            style={{ width: "100%", borderRadius: 8, display: "block" }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
