export function computeStitchSize(
  left: { width: number; height: number },
  right: { width: number; height: number },
): { width: number; height: number; leftW: number; rightW: number } {
  const height = Math.max(left.height, right.height, 1);
  const leftW = Math.round((left.width * height) / Math.max(left.height, 1));
  const rightW = Math.round((right.width * height) / Math.max(right.height, 1));
  return { width: leftW + rightW, height, leftW, rightW };
}

export async function stitchPhotoBlobs(left: Blob, right: Blob): Promise<Blob> {
  const [leftBmp, rightBmp] = await Promise.all([blobToBitmap(left), blobToBitmap(right)]);
  const size = computeStitchSize(leftBmp, rightBmp);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    leftBmp.close?.();
    rightBmp.close?.();
    throw new Error("canvas");
  }
  ctx.drawImage(leftBmp, 0, 0, size.leftW, size.height);
  ctx.drawImage(rightBmp, size.leftW, 0, size.rightW, size.height);
  leftBmp.close?.();
  rightBmp.close?.();
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("blob"))), "image/jpeg", 0.92);
  });
}

async function blobToBitmap(blob: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(blob);
  }
  throw new Error("unsupported");
}
