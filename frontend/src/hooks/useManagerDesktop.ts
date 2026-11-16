import { useMediaQuery, useTheme } from "@mui/material";

/** Grand écran (≥ md) : rail latéral et deux colonnes au lieu de la pilule du bas (étape 8). */
export function useManagerDesktop(): boolean {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up("md"), { noSsr: true });
}
