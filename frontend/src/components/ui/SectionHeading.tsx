import type { ReactNode } from "react";
import { Box, Typography, alpha } from "@mui/material";

interface SectionHeadingProps {
  title: string;
  /** Pastille de comptage à côté du titre (masquée si absente ou à 0). */
  count?: number;
  /** Couleur d'accent (barre + pastille). */
  color?: string;
  /** Contrôles alignés à l'autre bord (filtres, boutons). */
  trailing?: ReactNode;
  mb?: number;
}

/** Titre de section commun : barre d'accent, titre, pastille de comptage. */
export default function SectionHeading({
  title,
  count,
  color = "primary.main",
  trailing,
  mb = 1.5,
}: SectionHeadingProps) {
  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={mb}>
      <Box aria-hidden sx={{ width: 6, height: 22, borderRadius: 3, bgcolor: color }} />
      <Typography component="h2" variant="subtitle1" fontWeight={800} sx={{ fontSize: "1.05rem" }}>
        {title}
      </Typography>
      {count != null && count > 0 ? <CountPill count={count} color={color} /> : null}
      {trailing ? <Box sx={{ marginInlineStart: "auto", display: "flex", gap: 1, flexWrap: "wrap" }}>{trailing}</Box> : null}
    </Box>
  );
}

function CountPill({ count, color }: { count: number; color: string }) {
  return (
    <Box
      component="span"
      sx={{
        minWidth: 26,
        height: 26,
        px: 0.9,
        borderRadius: 999,
        display: "inline-grid",
        placeItems: "center",
        fontSize: "0.85rem",
        fontWeight: 800,
        color,
        bgcolor: (t) => alpha(resolveColor(t.palette as unknown as PaletteLike, color), 0.12),
      }}
    >
      {count}
    </Box>
  );
}

type PaletteLike = Record<string, Record<string, string> | undefined>;

/** Accepte « primary.main » (palette) ou un hex ; renvoie une couleur utilisable par alpha(). */
function resolveColor(palette: PaletteLike, color: string): string {
  const [group, shade] = color.split(".");
  return palette[group]?.[shade] ?? color;
}
