import { Button, CircularProgress } from "@mui/material";
import { he } from "../../i18n/he";
import { dialogSecondaryActionSx } from "../../styles/dialogUi";
import { employeePrimaryButtonSx } from "../../styles/employeeUi";

/**
 * Boutons de pied de fenêtre d'édition : textes explicites (pas d'icônes seules).
 * À placer dans un `DialogActions` empilé : l'action principale s'affiche en haut.
 */
export default function EditDialogFooterButtons({
  onCancel,
  onSubmit,
  disabled = false,
  submitDisabled = false,
  submitting = false,
  submitLabel = he.saveChanges,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  submitDisabled?: boolean;
  submitting?: boolean;
  submitLabel?: string;
}) {
  return (
    <>
      <Button onClick={onCancel} disabled={disabled} sx={dialogSecondaryActionSx}>
        {he.cancel}
      </Button>
      <Button
        variant="contained"
        onClick={onSubmit}
        disabled={disabled || submitDisabled || submitting}
        aria-busy={submitting || undefined}
        sx={employeePrimaryButtonSx}
      >
        {submitting ? <CircularProgress size={24} color="inherit" /> : submitLabel}
      </Button>
    </>
  );
}
