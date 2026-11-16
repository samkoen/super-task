import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";

/** Carte blanche de l'accueil (rayon 28, padding 24), comme la carte « pouls » du Figma. */
export const homeCardSx = {
  bgcolor: flowColor.neutral0,
  borderRadius: `${flowRadius.xl2}px`,
  p: "24px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
} as const;

/** Titre H2 posé sur le fond (« לטיפולך · 5 », « הצוות עכשיו »). */
export function HomeSectionTitle({ children, testId }: { children: ReactNode; testId?: string }) {
  return (
    <Typography component="h2" data-testid={testId} sx={{ ...flowText.h2, color: flowColor.neutral900 }}>
      {children}
    </Typography>
  );
}

/** Pastille de texte (chip « 3 באיחור », filtres). */
export function HomeChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warning" }) {
  return (
    <Box
      component="span"
      sx={{
        ...flowText.label,
        px: "10px",
        py: "4px",
        borderRadius: `${flowRadius.full}px`,
        bgcolor: tone === "warning" ? flowColor.yellow300 : flowColor.neutral100,
        color: flowColor.neutral900,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Box>
  );
}
