/** Pastel backgrounds for card grids (cycle by index). */
export const CARD_COLORS = [
  { bg: "#e3f2fd", accent: "#1565c0" },
  { bg: "#fce4ec", accent: "#c2185b" },
  { bg: "#e0f7fa", accent: "#00838f" },
  { bg: "#fff3e0", accent: "#ef6c00" },
  { bg: "#e8f5e9", accent: "#2e7d32" },
  { bg: "#fff8e1", accent: "#f9a825" },
] as const;

export function cardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}
