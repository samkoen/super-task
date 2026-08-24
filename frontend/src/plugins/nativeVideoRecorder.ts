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

export function canUseNativeVideoRecorder(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export async function fileFromNativePath(path: string, mimeType = "video/mp4"): Promise<File> {
  const src = path.startsWith("file:") ? path : `file://${path}`;
  const url = Capacitor.convertFileSrc(src);
  const blob = await (await fetch(url)).blob();
  if (!blob.size) {
    throw new Error("empty-video");
  }
  return blobToFile(blob, `task-video-${Date.now()}.mp4`, mimeType);
}

export async function recordNativeVideo(options?: {
  minSeconds?: number | null;
}): Promise<{ file: File; durationSeconds: number } | null> {
  if (!canUseNativeVideoRecorder()) {
    return null;
  }
  const granted = await ensureNativeAvPermissions({ camera: true, microphone: true });
  if (!granted) {
    throw new Error("permission");
  }
  const raw = await NativeVideoRecorder.record({
    minSeconds: options?.minSeconds ?? undefined,
  });
  if (raw.cancelled || !raw.path) {
    return null;
  }
  return {
    file: await fileFromNativePath(raw.path, raw.mimeType || "video/mp4"),
    durationSeconds: Math.max(1, raw.durationSeconds ?? 1),
  };
}
