import { flowColor, flowRadius, flowSize, flowText } from "../../../../styles/flowTokens";
import { withSystemBottomInsetCss } from "../../../../utils/systemInsets";

/**
 * Habillage du studio menahel : mêmes jetons que le FLOW 1 de l'oved (Figma « Super-Man app »),
 * pour que le menahel construise la tâche dans l'apparence exacte que verra l'oved.
 */

/** Largeur de la colonne (écran Figma 393 px), centrée sur les grands écrans. */
export const STUDIO_MAX_WIDTH = 393;

/** Bloc blanc arrondi (28) : sections « מתי », « מי מבצע », etc. */
export const studioSectionSx = {
  bgcolor: flowColor.neutral0,
  borderRadius: `${flowRadius.xl2}px`,
  px: "20px",
  py: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
} as const;

/** Bouton principal noir (Figma « אישור » / « הבנתי ») en pleine largeur. */
export const studioPrimarySx = {
  width: "100%",
  height: 56,
  borderRadius: `${flowRadius.sm}px`,
  bgcolor: flowColor.neutral900,
  color: flowColor.neutral0,
  fontFamily: flowText.button.fontFamily,
  fontSize: 18,
  fontWeight: 700,
  "&.Mui-disabled": { opacity: 0.45, color: flowColor.neutral0 },
} as const;

/** Bouton secondaire : contour léger sur fond blanc. */
export const studioSecondarySx = {
  width: "100%",
  height: 56,
  borderRadius: `${flowRadius.sm}px`,
  border: `1px solid ${flowColor.neutral300}`,
  bgcolor: flowColor.neutral0,
  color: flowColor.neutral900,
  ...flowText.button,
  fontSize: 16,
} as const;

/** Petit bouton de carte (40 px), comme « צלם סרטון » / « דוגמא לצילום נכון ». */
export const studioSmallButtonSx = {
  height: flowSize.buttonSmall,
  px: "12px",
  gap: "6px",
  borderRadius: `${flowRadius.sm}px`,
  ...flowText.button,
} as const;

/** Pastille de choix (récurrence, jour, oved) : neutre, ou navy quand choisie. */
export function studioPillSx(selected: boolean) {
  return {
    height: 40,
    px: "16px",
    borderRadius: `${flowRadius.full}px`,
    border: `1px solid ${selected ? flowColor.navy800 : flowColor.neutral300}`,
    bgcolor: selected ? flowColor.navy800 : flowColor.neutral0,
    color: selected ? flowColor.neutral0 : flowColor.neutral900,
    ...flowText.label,
    fontSize: 15,
  } as const;
}

/** Champ texte « nu » posé dans la carte : même typo que le texte affiché à l'oved. */
export const studioBareInputSx = {
  width: "100%",
  p: 0,
  "& .MuiInputBase-input, & .MuiInputBase-inputMultiline": { p: 0, textAlign: "right" },
  "& .MuiInputBase-input::placeholder": { color: flowColor.alphaNeutral900_60, opacity: 1 },
} as const;

/** Champ texte encadré (description, durée) aux couleurs du FLOW. */
export const studioFieldSx = {
  "& .MuiOutlinedInput-root": {
    fontFamily: flowText.body.fontFamily,
    fontSize: 16,
    borderRadius: `${flowRadius.md}px`,
    bgcolor: flowColor.neutral100,
    "& fieldset": { borderColor: "transparent" },
    "&:hover fieldset": { borderColor: flowColor.neutral300 },
    "&.Mui-focused fieldset": { borderColor: flowColor.navy800, borderWidth: 1 },
  },
} as const;

export const studioSheetPaperSx = {
  maxWidth: STUDIO_MAX_WIDTH,
  mx: "auto",
  px: `${flowSize.contentPaddingX}px`,
  pt: "12px",
  pb: withSystemBottomInsetCss("24px"),
  gap: "16px",
  display: "flex",
  flexDirection: "column",
  bgcolor: flowColor.neutral0,
  borderRadius: `${flowRadius.xl2}px ${flowRadius.xl2}px 0 0`,
  maxHeight: "88dvh",
  overflowY: "auto",
} as const;
