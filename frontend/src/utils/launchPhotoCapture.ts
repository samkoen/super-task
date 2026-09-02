import { canUseNativePhotoCapture, captureNativePhoto } from "../plugins/nativePhotoCapture";

export async function launchPhotoCapture(options: {
  openWeb: () => void;
  onNative: (file: File) => void | Promise<void>;
  onPermissionDenied: () => void;
}): Promise<void> {
  if (!canUseNativePhotoCapture()) {
    options.openWeb();
    return;
  }
  try {
    const file = await captureNativePhoto();
    if (file) {
      await options.onNative(file);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "permission") {
      options.onPermissionDenied();
      return;
    }
    options.openWeb();
  }
}
