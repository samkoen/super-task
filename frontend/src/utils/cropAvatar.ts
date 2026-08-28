export const AVATAR_OUTPUT_SIZE = 512;

export type AvatarCrop = {
  panX: number;
  panY: number;
  zoom: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rectangle source (carré) pour un masque circulaire centré sur le visage. */
export function avatarSourceRect(
  imageWidth: number,
  imageHeight: number,
  crop: AvatarCrop,
): { sx: number; sy: number; sw: number; sh: number } {
  const zoom = Math.max(1, crop.zoom);
  const side = Math.min(imageWidth, imageHeight) / zoom;
  const maxX = Math.max(0, imageWidth - side);
  const maxY = Math.max(0, imageHeight - side);
  const sx = clamp((imageWidth - side) / 2 + (crop.panX * maxX) / 2, 0, maxX);
  const sy = clamp((imageHeight - side) / 2 + (crop.panY * maxY) / 2, 0, maxY);
  return { sx, sy, sw: side, sh: side };
}

export async function cropAvatarToJpeg(
  image: HTMLImageElement,
  crop: AvatarCrop,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<Blob> {
  const { sx, sy, sw, sh } = avatarSourceRect(image.naturalWidth, image.naturalHeight, crop);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas");
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outputSize, outputSize);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("jpeg"))),
      "image/jpeg",
      0.92,
    );
  });
}
