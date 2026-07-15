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

export const PHOTO_CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: "environment" } }, audio: false },
  { video: true, audio: false },
];

export const VIDEO_CAMERA_CONSTRAINTS: MediaStreamConstraints[] = [
  { video: { facingMode: { ideal: "environment" } }, audio: true },
  { video: true, audio: true },
];

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
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
  });
}

export function pickVideoRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
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
