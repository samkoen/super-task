import { canUseNativeVideoRecorder, recordNativeVideo } from "../plugins/nativeVideoRecorder";

export async function launchVideoCapture(options: {
  minSeconds?: number | null;
  openWeb: () => void;
  onNative: (file: File, durationSeconds: number) => void | Promise<void>;
  onPermissionDenied: () => void;
}): Promise<void> {
  if (!canUseNativeVideoRecorder()) {
    options.openWeb();
    return;
  }
  try {
    const result = await recordNativeVideo({ minSeconds: options.minSeconds });
    if (result) {
      await options.onNative(result.file, result.durationSeconds);
    }
  } catch (error) {
    if (error instanceof Error && error.message === "permission") {
      options.onPermissionDenied();
      return;
    }
    options.openWeb();
  }
}
