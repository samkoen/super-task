import {
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx, dialogStackedActionsSx } from "../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";

/** Confirmation de suppression : nom de l'élément rappelé, bouton rouge en haut, annulation en bas. */
export default function ConfirmDeleteDialog({
  open,
  title,
  itemName,
  message,
  optionLabel,
  optionChecked = false,
  onOptionChange,
  saving = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  itemName?: string;
  message: string;
  /** Case « supprimer aussi dans tous les snifim » (affichée seulement si fournie). */
  optionLabel?: string;
  optionChecked?: boolean;
  onOptionChange?: (checked: boolean) => void;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={() => !saving && onCancel()} fullWidth maxWidth="xs" dir="rtl">
      <DialogTitle sx={{ fontWeight: 800 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
        {itemName ? <Typography fontWeight={800}>{itemName}</Typography> : null}
        <Typography sx={{ fontSize: "1.05rem" }}>{message}</Typography>
        {optionLabel ? (
          <FormControlLabel
            control={
              <Checkbox
                checked={optionChecked}
                onChange={(e) => onOptionChange?.(e.target.checked)}
                disabled={saving}
              />
            }
            label={optionLabel}
          />
        ) : null}
      </DialogContent>
      <DialogActions sx={dialogStackedActionsSx}>
        <Button onClick={onCancel} disabled={saving} sx={dialogSecondaryActionSx}>
          {he.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={saving}
          sx={{ ...employeePrimaryButtonSx, bgcolor: "error.main", "&:hover": { bgcolor: "error.dark" } }}
        >
          {saving ? <CircularProgress size={24} color="inherit" /> : he.taskDeleteConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
