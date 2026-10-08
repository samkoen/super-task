import { alpha } from "@mui/material";

/** Coque commune des cartes « à traiter » (revue, question, discussion directe). */
export function actionCardSx(color: string, clickable: boolean) {
  return {
    width: 240,
    minWidth: 220,
    maxWidth: 260,
    flex: "0 0 auto",
    p: 1.75,
    display: "flex",
    flexDirection: "column",
    gap: 0.75,
    scrollSnapAlign: "start",
    borderStyle: "solid",
    borderWidth: 1.5,
    borderColor: alpha(color, 0.35),
    borderInlineStartWidth: 6,
    borderInlineStartColor: color,
    borderRadius: "16px",
    bgcolor: alpha(color, 0.05),
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
    cursor: clickable ? "pointer" : undefined,
    textAlign: "start",
    font: "inherit",
    color: "inherit",
    "&:hover": clickable ? { bgcolor: alpha(color, 0.12) } : undefined,
  } as const;
}

/** Limite le texte à `lines` lignes avec points de suspension. */
export function clampSx(lines: number) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: lines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "anywhere",
  } as const;
}

/** Bouton d'action plein, assez grand pour un pouce. */
export function actionCardButtonSx(color: string) {
  return {
    mt: 0.5,
    minHeight: 40,
    borderRadius: "12px",
    fontWeight: 800,
    fontSize: "0.95rem",
    bgcolor: color,
    "&:hover": { bgcolor: color, filter: "brightness(0.92)" },
  } as const;
}
