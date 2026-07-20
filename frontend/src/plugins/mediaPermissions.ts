import { Capacitor, registerPlugin } from "@capacitor/core";

export type MediaPermissionState = "prompt" | "prompt-with-rationale" | "granted" | "denied";

export interface MediaPermissionStatus {
  camera: MediaPermissionState | string;
  microphone: MediaPermissionState | string;
}

interface MediaPermissionsPlugin {
  request(options?: { camera?: boolean; microphone?: boolean }): Promise<MediaPermissionStatus>;
  check(): Promise<MediaPermissionStatus>;
}

const MediaPermissions = registerPlugin<MediaPermissionsPlugin>("MediaPermissions");

/**
 * Demande les permissions natives caméra / micro (dialogue Android).
 * No-op sur le web — le navigateur affiche son propre prompt.
 */
export async function ensureNativeAvPermissions(options?: {
  camera?: boolean;
  microphone?: boolean;
}): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;
  const needCamera = options?.camera !== false;
  const needMic = options?.microphone === true;
  try {
    const status = await MediaPermissions.request({
      camera: needCamera,
      microphone: needMic,
    });
    if (needCamera && status.camera !== "granted") return false;
    if (needMic && status.microphone !== "granted") return false;
    return true;
  } catch {
    return false;
  }
}
