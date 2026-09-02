import { Capacitor, registerPlugin } from "@capacitor/core";
import { ensureNativeAvPermissions } from "./mediaPermissions";
import { blobToFile } from "../utils/mediaCapture";

export type NativeVideoRecordResult = {
  cancelled: boolean;
  path?: string;
  mimeType?: string;
  durationSeconds?: number;
};

interface NativeVideoRecorderPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  record(options?: { minSeconds?: number }): Promise<NativeVideoRecordResult>;
}

const NativeVideoRecorder = registerPlugin<NativeVideoRecorderPlugin>("NativeVideoRecorder");

export function canUseNativeAndroidCamera(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export function canUseNativeVideoRecorder(): boolean {
  return canUseNativeAndroidCamera();
}

export async function fileFromNativePath(
  path: string,
  mimeType = "video/mp4",
  filename?: string,
): Promise<File> {
  const src = path.startsWith("file:") ? path : `file://${path}`;
  const url = Capacitor.convertFileSrc(src);
  const blob = await (await fetch(url)).blob();
  if (!blob.size) {
    throw new Error("empty-video");
  }
  return blobToFile(blob, filename ?? nativeFileName(mimeType), mimeType);
}

function nativeFileName(mimeType: string): string {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return `task-photo-${Date.now()}.jpg`;
  }
  return `task-video-${Date.now()}.mp4`;
}

export async function recordNativeVideo(options?: {
  minSeconds?: number | null;
}): Promise<{ file: File; durationSeconds: number } | null> {
  if (!canUseNativeVideoRecorder()) {
    return null;
  }
  const granted = await ensureNativeAvPermissions({
    camera: true,
    microphone: true,
    requireMicrophone: false,
  });
  if (!granted) {
    throw new Error("permission");
  }
  const minSeconds = options?.minSeconds ?? undefined;
  const raw = await NativeVideoRecorder.record({ minSeconds });
  if (raw.cancelled || !raw.path) {
    return null;
  }
  const durationSeconds = Math.max(0, raw.durationSeconds ?? 0);
  if (minSeconds && durationSeconds < minSeconds) {
    throw new Error("too-short");
  }
  return {
    file: await fileFromNativePath(raw.path, raw.mimeType || "video/mp4"),
    durationSeconds: Math.max(1, durationSeconds),
  };
}
