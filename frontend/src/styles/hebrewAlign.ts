/**
 * Utilitaires d'alignement hébreu (RTL) — calqués sur exam.
 */

export const hebrewAlignRightSx = {
  dir: "rtl",
  width: "100%",
  textAlign: "right",
} as const;

/** Menu latéral : icône à gauche physique, libellé hébreu à droite. */
export const sidebarNavButtonSx = {
  flexDirection: "row",
  direction: "ltr",
  justifyContent: "flex-start",
  gap: 1,
} as const;

export const sidebarNavIconSx = {
  minWidth: 40,
  margin: 0,
  justifyContent: "center",
} as const;

export const sidebarNavTextSx = {
  flex: 1,
  margin: 0,
  textAlign: "right",
} as const;

export const sidebarHeaderSx = {
  flexShrink: 0,
  px: 2,
  py: 2.25,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
} as const;
