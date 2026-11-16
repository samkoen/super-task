import type { ReactNode } from "react";
import { Box } from "@mui/material";

const columnSx = { display: "flex", flexDirection: "column", gap: "20px", minWidth: 0 } as const;

/**
 * Deux colonnes FLOW sur ordinateur (étape 8), une seule sur mobile : la première (ce qui attend
 * le menahel) passe avant la seconde (l'équipe, les snifim), dans le même ordre de lecture.
 */
export default function ManagerColumns({ first, second }: { first: ReactNode; second: ReactNode }) {
  return (
    <Box
      data-testid="manager-columns"
      sx={{
        display: "grid",
        gap: { xs: "20px", md: "24px" },
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
        alignItems: "start",
      }}
    >
      <Box data-testid="manager-column-first" sx={columnSx}>{first}</Box>
      <Box data-testid="manager-column-second" sx={columnSx}>{second}</Box>
    </Box>
  );
}
