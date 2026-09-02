import { registerPlugin } from "@capacitor/core";
import { ensureNativeAvPermissions } from "./mediaPermissions";
import {
  canUseNativeAndroidCamera,
  fileFromNativePath,
} from "./nativeVideoRecorder";

export type NativePhotoCaptureResult = {
  cancelled: boolean;
  path?: string;
  mimeType?: string;
};

interface NativePhotoCapturePlugin {
  capture(): Promise<NativePhotoCaptureResult>;
}

const NativePhotoCapture = registerPlugin<NativePhotoCapturePlugin>("NativePhotoCapture");

export function canUseNativePhotoCapture(): boolean {
  return canUseNativeAndroidCamera();
}

export async function captureNativePhoto(): Promise<File | null> {
  if (!canUseNativePhotoCapture()) {
    return null;
  }
  const granted = await ensureNativeAvPermissions({
    camera: true,
    microphone: false,
  });
  if (!granted) {
    throw new Error("permission");
  }
  const raw = await NativePhotoCapture.capture();
  if (raw.cancelled || !raw.path) {
    return null;
  }
  return fileFromNativePath(raw.path, raw.mimeType || "image/jpeg");
}
