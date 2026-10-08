import { dialogActionsPbCss } from "../utils/systemInsets";

/** Boutons de fenêtre empilés : action principale en haut (pleine largeur), annulation en bas. */
export const dialogStackedActionsSx = {
  px: 3,
  pb: dialogActionsPbCss(),
  flexDirection: "column-reverse",
  alignItems: "stretch",
  gap: 1,
  "& > :not(style) ~ :not(style)": { marginLeft: 0 },
} as const;

/** Bouton secondaire (annuler, réessayer) : aussi facile à toucher que le principal. */
export const dialogSecondaryActionSx = {
  minHeight: 48,
  borderRadius: "14px",
  fontWeight: 700,
} as const;
