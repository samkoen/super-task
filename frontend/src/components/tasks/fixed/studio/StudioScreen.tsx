import type { ReactNode } from "react";
import { Box, ButtonBase, CircularProgress, Dialog, Typography } from "@mui/material";
import { he } from "../../../../i18n/he";
import { flowColor, flowScreenBackground, flowText } from "../../../../styles/flowTokens";
import { STUDIO_MAX_WIDTH, studioPrimarySx, studioSecondarySx, studioSectionSx } from "./studioUi";
import { withSystemBottomInsetCss } from "../../../../utils/systemInsets";

/**
 * Écran plein du studio (fond du FLOW 1 avec la lueur orangée), colonne de 393 px centrée.
 * `onBack` : même action que « חזרה » de l'en-tête (bouton retour Android, touche Échap).
 */
export function StudioScreen({ header, children, footer, onBack }: { header: ReactNode; children: ReactNode; footer?: ReactNode; onBack?: () => void }) {
  return (
    <Dialog open fullScreen dir="rtl" disableEnforceFocus onClose={onBack} PaperProps={{ sx: { background: flowScreenBackground } }}>
      <Box data-testid="fixed-task-studio" sx={{ width: "100%", maxWidth: STUDIO_MAX_WIDTH, mx: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
        {header}
        <Box sx={{ px: "24px", pb: "24px", display: "flex", flexDirection: "column", gap: "20px", flex: 1 }}>{children}</Box>
        {footer}
      </Box>
    </Dialog>
  );
}

/** Bloc blanc arrondi avec titre H2 (« מתי », « מי מבצע »…). */
export function StudioSection({ title, hint, children, testId }: { title: string; hint?: string; children: ReactNode; testId?: string }) {
  return (
    <Box component="section" data-testid={testId} sx={studioSectionSx}>
      <Box>
        <Typography component="h2" sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{title}</Typography>
        {hint ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60, mt: "4px" }}>{hint}</Typography> : null}
      </Box>
      {children}
    </Box>
  );
}

/** Titre de groupe posé sur le fond (au-dessus de la pile de cartes). */
export function StudioGroupTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <Box sx={{ px: "4px" }}>
      <Typography component="h2" sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{title}</Typography>
      {hint ? <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60, mt: "2px" }}>{hint}</Typography> : null}
    </Box>
  );
}

/**
 * Barre du bas collée à l'écran : le gros bouton noir et, au-dessus, ce qui bloque encore
 * (ou l'effet de l'enregistrement sur les snifim).
 */
export function StudioSaveBar({
  label,
  onSave,
  saving,
  disabled,
  note,
  noteTestId,
  secondary,
}: {
  label: string;
  onSave: () => void;
  saving: boolean;
  disabled?: boolean;
  note?: string;
  noteTestId?: string;
  secondary?: { label: string; onClick: () => void };
}) {
  return (
    <Box
      data-testid="studio-save-bar"
      sx={{
        position: "sticky",
        bottom: 0,
        zIndex: 30,
        px: "24px",
        pt: "14px",
        pb: withSystemBottomInsetCss("16px"),
        background: `linear-gradient(to top, ${flowColor.neutral100} 70%, rgba(232,236,239,0))`,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {note ? (
        <Typography data-testid={noteTestId} sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60, textAlign: "center" }}>
          {note}
        </Typography>
      ) : null}
      <Box sx={{ display: "flex", gap: "10px" }}>
        {secondary ? (
          <ButtonBase onClick={secondary.onClick} disabled={saving} sx={{ ...studioSecondarySx, flex: 1 }}>
            {secondary.label}
          </ButtonBase>
        ) : null}
        <ButtonBase onClick={onSave} disabled={saving || disabled} sx={{ ...studioPrimarySx, flex: 2 }}>
          {saving ? <CircularProgress size={24} sx={{ color: flowColor.neutral0 }} /> : label}
        </ButtonBase>
      </Box>
    </Box>
  );
}

/** « לצאת בלי לשמור? » : feuille de confirmation quand on quitte avec des changements. */
export function StudioLeaveDialog({ open, onStay, onLeave }: { open: boolean; onStay: () => void; onLeave: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onStay}
      dir="rtl"
      PaperProps={{ sx: { borderRadius: "28px", p: "24px", width: "100%", maxWidth: 345, display: "flex", flexDirection: "column", gap: "12px" } }}
    >
      <Typography component="h2" sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{he.studioLeaveTitle}</Typography>
      <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.studioLeaveBody}</Typography>
      <ButtonBase onClick={onStay} sx={{ ...studioPrimarySx, mt: "8px" }}>{he.studioLeaveStay}</ButtonBase>
      <ButtonBase onClick={onLeave} sx={{ ...studioSecondarySx, color: "#b3261e" }}>{he.studioLeaveConfirm}</ButtonBase>
    </Dialog>
  );
}
