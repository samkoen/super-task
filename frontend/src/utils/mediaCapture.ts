export function blobToFile(blob: Blob, filename: string, type?: string): File {
  const mime = type ?? blob.type;
  return new File([blob], filename, { type: mime || undefined });
}

export type MediaCaptureErrorCode = "permission" | "unsupported" | "device" | "unknown";

export function classifyMediaError(error: unknown): MediaCaptureErrorCode {
  if (!(error instanceof DOMException)) return "unknown";
  if (error.name === "NotAllowedError" || error.name === "SecurityError") return "permission";
  if (error.name === "NotFoundError" || error.name === "NotReadableError" || error.name === "OverconstrainedError") {
    return "device";
  }
  return "unknown";
}

export async function getUserMediaWithFallback(
  constraintsList: MediaStreamConstraints[]
): Promise<MediaStream> {
  const needCamera = constraintsList.some((c) => Boolean(c.video));
  const needMic = constraintsList.some((c) => Boolean(c.audio));
  const { ensureNativeAvPermissions } = await import("../plugins/mediaPermissions");
  const granted = await ensureNativeAvPermissions({
    camera: needCamera,
    microphone: needMic,
  });
  if (!granted) {
    throw new DOMException("Permission denied", "NotAllowedError");
  }

  let lastError: unknown;
  for (const constraints of constraintsList) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
        throw error;
      }
    }
  }
  throw lastError ?? new DOMException("No device", "NotFoundError");
}

export type CameraFacing = "user" | "environment";

export function oppositeCameraFacing(facing: CameraFacing): CameraFacing {
  return facing === "user" ? "environment" : "user";
}

export function cameraConstraints(
  facing: CameraFacing,
  audio: boolean,
): MediaStreamConstraints[] {
  return [
    { video: { facingMode: { ideal: facing } }, audio },
    { video: true, audio },
  ];
}

export const PHOTO_CAMERA_CONSTRAINTS = cameraConstraints("environment", false);
export const VIDEO_CAMERA_CONSTRAINTS = cameraConstraints("environment", true);

export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
  muted = true
): Promise<void> {
  video.srcObject = stream;
  video.muted = muted;
  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      resolve();
      return;
    }
    const onReady = () => {
      video.removeEventListener("loadedmetadata", onReady);
      resolve();
    };
    video.addEventListener("loadedmetadata", onReady);
  });
  try {
    await video.play();
  } catch {
    // Preview may fail autoplay rules even when capture is allowed.
  }
}

export function capturePhotoFromVideo(video: HTMLVideoElement): Promise<Blob | null> {
  if (!video.videoWidth || !video.videoHeight) {
    return Promise.resolve(null);
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", PHOTO_JPEG_QUALITY);
  });
}

/** Aligné sur le back (1280) — Vercel refuse un body > ~4,5 Mo. */
export const PHOTO_UPLOAD_MAX_EDGE = 1280;
export const PHOTO_PREVIEW_MAX_EDGE = PHOTO_UPLOAD_MAX_EDGE;
export const PHOTO_JPEG_QUALITY = 0.72;

export function photoPreviewSize(
  width: number,
  height: number,
  maxEdge = PHOTO_UPLOAD_MAX_EDGE,
): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge) return { width, height };
  const scale = maxEdge / edge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function photoUploadFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}.jpg`;
}

function photoSourceSize(source: ImageBitmap | HTMLImageElement): { width: number; height: number } {
  if ("naturalWidth" in source && source.naturalWidth > 0) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: source.width, height: source.height };
}

function closePhotoSource(source: ImageBitmap | HTMLImageElement): void {
  if ("close" in source && typeof source.close === "function") source.close();
}

function loadBlobImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(blob);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image"));
    };
    image.src = url;
  });
}

async function decodePhotoSource(blob: Blob): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { imageOrientation: "from-image" });
    } catch {
      /* WebView Android : retomber sur Image */
    }
  }
  try {
    return await loadBlobImage(blob);
  } catch {
    return null;
  }
}

export async function encodePhotoJpeg(
  blob: Blob,
  maxEdge = PHOTO_UPLOAD_MAX_EDGE,
): Promise<Blob | null> {
  const source = await decodePhotoSource(blob);
  if (!source) return null;
  const { width, height } = photoSourceSize(source);
  if (width < 1 || height < 1) {
    closePhotoSource(source);
    return null;
  }
  const size = photoPreviewSize(width, height, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    closePhotoSource(source);
    return null;
  }
  ctx.drawImage(source, 0, 0, size.width, size.height);
  closePhotoSource(source);
  return new Promise((resolve) => {
    canvas.toBlob((out) => resolve(out), "image/jpeg", PHOTO_JPEG_QUALITY);
  });
}

/** Orientation EXIF + downscale pour l'aperçu et l'upload. */
export async function normalizePhotoOrientation(blob: Blob): Promise<Blob> {
  return (await encodePhotoJpeg(blob)) ?? blob;
}

/** JPEG ≤ 1280 px — évite le 413 Vercel / CapacitorHttp. */
export async function compressPhotoForUpload(file: File): Promise<File> {
  const encoded = await encodePhotoJpeg(file);
  if (!encoded) return file;
  return blobToFile(encoded, photoUploadFilename(file.name), "image/jpeg");
}

export const VIDEO_RECORD_BITRATE = 1_000_000;

export function pickVideoRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function videoRecorderOptions(mimeType?: string): MediaRecorderOptions {
  const options: MediaRecorderOptions = { videoBitsPerSecond: VIDEO_RECORD_BITRATE };
  if (mimeType) options.mimeType = mimeType;
  return options;
}

export function isMediaCaptureSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    window.isSecureContext &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}
