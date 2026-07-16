/** Soft accent surfaces for task cards (cycle by index). */
export const CARD_COLORS = [
  { bg: "#EEF6F4", accent: "#0A6B5C" },
  { bg: "#F0F4FA", accent: "#1D4E89" },
  { bg: "#F7F2EE", accent: "#9A5B3C" },
  { bg: "#F3F0F7", accent: "#5B4B8A" },
  { bg: "#F0F6F0", accent: "#2F6B45" },
  { bg: "#F7F4EA", accent: "#8A6D1F" },
] as const;

export function cardColor(index: number) {
  return CARD_COLORS[index % CARD_COLORS.length];
}
