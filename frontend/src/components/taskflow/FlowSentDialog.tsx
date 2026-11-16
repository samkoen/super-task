import { Box, ButtonBase, Dialog, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../styles/flowTokens";

type Props = {
  open: boolean;
  /** Nombre de vidéos parties au menahel ; 0 = texte sans chiffre. */
  count: number;
  /** « מעבר למשימות היומיות » : ferme le flow et revient aux tâches du jour. */
  onContinue: () => void;
};

const paperSx = {
  m: 0,
  width: 262,
  maxWidth: "calc(100% - 48px)",
  p: "16px",
  gap: "12px",
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  borderRadius: `${flowRadius.xl2 - 4}px`,
  bgcolor: flowColor.neutral0,
  boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
} as const;

/**
 * Écran 11 : popup de confirmation après l'envoi des vidéos (au-dessus du récap, fond assombri).
 * Pas de fermeture par le fond : la seule sortie est le bouton vers les tâches du jour.
 */
export default function FlowSentDialog({ open, count, onContinue }: Props) {
  return (
    <Dialog
      open={open}
      dir="rtl"
      aria-labelledby="flow-sent-title"
      slotProps={{ backdrop: { sx: { bgcolor: "rgba(21,25,35,0.48)" } } }}
      PaperProps={{ sx: paperSx, "data-testid": "flow-sent-dialog" } as object}
    >
      <Typography id="flow-sent-title" component="h2" sx={{ ...flowText.h1, color: flowColor.neutral900, textAlign: "center" }}>
        {he.flowSentTitle}
      </Typography>
      <Typography data-testid="flow-sent-body" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center" }}>
        {count > 0 ? he.flowSentBody(count) : he.flowSentBodyNone}
      </Typography>
      <ButtonBase
        data-testid="flow-sent-continue"
        onClick={onContinue}
        sx={{ height: 52, mt: "4px", borderRadius: `${flowRadius.sm}px`, bgcolor: flowColor.neutral900, color: flowColor.neutral0, ...flowText.button }}
      >
        <Box component="span">{he.flowSentCta}</Box>
      </ButtonBase>
    </Dialog>
  );
}
