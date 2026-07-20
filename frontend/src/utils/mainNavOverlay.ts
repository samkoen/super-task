/**
 * Menu principal en overlay (s’ouvre/ferme) vs barre fixe.
 * Sur app native : toujours overlay — la barre doit partir au clic.
 */
export function shouldUseMainNavOverlay(isNative: boolean): boolean {
  return isNative;
}
