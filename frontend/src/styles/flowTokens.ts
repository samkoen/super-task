/**
 * Jetons du FLOW 1 (Figma « Super-Man app », page Design System).
 * Noms et valeurs identiques aux variables Figma ; réservés aux écrans de tâche oved,
 * le thème global (manager inclus) reste inchangé.
 */
export const FLOW_FONT = "'Rubik', 'Heebo', sans-serif";

export const flowColor = {
  neutral0: "#ffffff",
  neutral100: "#e8ecef",
  neutral300: "#d9dbe6",
  neutral600: "#5e5e5e",
  neutral900: "#11151d",
  orange300: "#ff894a",
  orange500: "#f7701e",
  green300: "#bddebf",
  green700: "#2e854d",
  navy800: "#12213f",
  ink: "#12223f",
  yellow300: "#ffd873",
  rec: "#e5322d",
  minMarker: "#8cd999",
  line: "#d9e3f2",
  alphaNeutral900_66: "rgba(17,21,29,0.66)",
  alphaNeutral900_60: "rgba(17,21,29,0.60)",
  alphaNeutral1000_53: "rgba(0,0,0,0.53)",
  alphaNeutral1000_10: "rgba(0,0,0,0.1)",
  alphaNavy800_18: "rgba(18,33,63,0.18)",
  alphaNavy800_72: "rgba(18,33,63,0.72)",
  alphaNavy800_60: "rgba(18,33,63,0.6)",
  alphaNeutral0_80: "rgba(255,255,255,0.8)",
  alphaNeutral0_19: "rgba(255,255,255,0.19)",
  alphaOrange500_20: "rgba(247,112,30,0.2)",
  /** Chat de tâche (écran 12) : surface inverse / action principale et teintes task/2. */
  inverse: "#0e1430",
  alphaGreen300_60: "rgba(189,222,191,0.6)",
  alphaGreen300_45: "rgba(189,222,191,0.45)",
  alphaGreen700_20: "rgba(46,133,77,0.2)",
  alphaGreen700_60: "rgba(46,133,77,0.6)",
  alphaNeutral0_70: "rgba(255,255,255,0.7)",
} as const;

export const flowShadow = { floating: "0px 6px 18px rgba(13,20,48,0.25)" } as const;

export const flowRadius = { xs: 6, sm: 12, md: 16, xl2: 28, full: 999 } as const;
export const flowSpace = { s4: 4, s12: 12, s16: 16, s24: 24 } as const;

/** Mesures du Figma (écran 393 × 852). */
export const flowSize = {
  cardWidth: 345,
  cardHeight: 422.385,
  cardPadding: 28,
  illustrationHeight: 213,
  illustrationImageWidth: 212.2,
  illustrationImageHeight: 176.833,
  tabOverlap: 24,
  tabNextHeight: 65,
  /** Onglets du dessous : le plus proche de la carte (315 × 71), le dernier plus étroit (272 × 66). */
  tabWideWidth: 315,
  tabNarrowWidth: 272,
  tabWideHeight: 71,
  tabNarrowHeight: 66,
  avatar: 40.615,
  tabDoneHeight: 72,
  roundButton: 56,
  buttonSmall: 40,
  buttonReview: 46,
  contentPaddingX: 24,
} as const;

/** Styles de texte du Figma (interligne 100 %, espacement 0). */
export const flowText = {
  display: { fontFamily: FLOW_FONT, fontSize: 30, fontWeight: 700, lineHeight: 1.2 },
  h1: { fontFamily: FLOW_FONT, fontSize: 24, fontWeight: 700, lineHeight: "normal" },
  h2: { fontFamily: FLOW_FONT, fontSize: 20, fontWeight: 700, lineHeight: "normal" },
  bodyLarge: { fontFamily: FLOW_FONT, fontSize: 18, fontWeight: 400, lineHeight: "normal" },
  body: { fontFamily: FLOW_FONT, fontSize: 15, fontWeight: 400, lineHeight: "normal" },
  button: { fontFamily: FLOW_FONT, fontSize: 15, fontWeight: 600, lineHeight: "normal" },
  label: { fontFamily: FLOW_FONT, fontSize: 13, fontWeight: 500, lineHeight: "normal" },
  caption: { fontFamily: FLOW_FONT, fontSize: 12, fontWeight: 500, lineHeight: "normal" },
} as const;

export type FlowTone = "white" | "green" | "orange";

/** Cycle de couleurs des cartes : le nombre de cartes varie (1 à 10), les teintes se répètent. */
const TONE_CYCLE: FlowTone[] = ["white", "green", "orange"];

export function flowToneForIndex(index: number): FlowTone {
  return TONE_CYCLE[((index % TONE_CYCLE.length) + TONE_CYCLE.length) % TONE_CYCLE.length];
}

export const flowToneColor: Record<FlowTone, { card: string; tab: string }> = {
  white: { card: flowColor.neutral0, tab: flowColor.neutral0 },
  green: { card: flowColor.green300, tab: flowColor.green300 },
  orange: { card: flowColor.orange300, tab: flowColor.orange500 },
};

/** Fond de l'écran : neutral-100 avec la lueur orangée du Figma (bg-glow). */
export const flowScreenBackground =
  `radial-gradient(circle at 100% 8%, rgba(247,112,30,0.16) 0%, rgba(247,112,30,0) 42%), ${flowColor.neutral100}`;
