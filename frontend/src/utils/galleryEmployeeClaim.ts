/** Recette galerie que l'oved peut se ramener. */
export function claimNeedsConfirm(item: { has_open?: boolean }): boolean {
  return Boolean(item.has_open);
}
