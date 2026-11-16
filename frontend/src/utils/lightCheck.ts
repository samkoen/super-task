/** Contrôle de lumière réel : luminosité moyenne des images échantillonnées pendant le tournage. */

/** Luminosité moyenne (0-255) en dessous de laquelle la vidéo est jugée trop sombre. */
export const MIN_AVERAGE_LUMA = 55;

/** Luminosité moyenne d'un tableau RGBA (pondération Rec. 709). */
export function meanLuma(rgba: ArrayLike<number>): number {
  const pixels = Math.floor(rgba.length / 4);
  if (pixels === 0) return 0;
  let sum = 0;
  for (let i = 0; i < pixels; i += 1) {
    const o = i * 4;
    sum += 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
  }
  return sum / pixels;
}

/** `null` quand rien n'a pu être mesuré : on n'affiche alors aucune ligne de lumière. */
export function lightEnough(samples: number[]): boolean | null {
  if (samples.length === 0) return null;
  const average = samples.reduce((total, value) => total + value, 0) / samples.length;
  return average >= MIN_AVERAGE_LUMA;
}
