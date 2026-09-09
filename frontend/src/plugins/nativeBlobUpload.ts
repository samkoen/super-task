import { Capacitor, registerPlugin } from "@capacitor/core";
import { blobBytes, bytesToBase64, videoFileExt } from "../utils/bytesToBase64";

const WRITE_CHUNK = 192 * 1024;

type NativeBlobUploadPlugin = {
  putFromFile(options: {
    path: string;
    url: string;
    headers: Record<string, string>;
  }): Promise<{ url: string }>;
  createTemp(options: { ext: string }): Promise<{ path: string }>;
  appendChunk(options: { path: string; data: string }): Promise<void>;
};

const NativeBlobUpload = registerPlugin<NativeBlobUploadPlugin>("NativeBlobUpload");

export function canUseNativeBlobUpload(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  } catch {
    return false;
  }
}

export async function putBlobFromNativePath(
  path: string,
  url: string,
  headers: Record<string, string>,
): Promise<{ url: string }> {
  const result = await NativeBlobUpload.putFromFile({ path, url, headers });
  if (!result?.url) {
    throw new Error("upload failed");
  }
  return result;
}

export async function writeFileToNativeCache(file: File): Promise<string> {
  const created = await NativeBlobUpload.createTemp({ ext: videoFileExt(file) });
  if (!created?.path) {
    throw new Error("upload failed");
  }
  const bytes = await blobBytes(file);
  for (let offset = 0; offset < bytes.length; offset += WRITE_CHUNK) {
    const slice = bytes.subarray(offset, offset + WRITE_CHUNK);
    await NativeBlobUpload.appendChunk({ path: created.path, data: bytesToBase64(slice) });
  }
  return created.path;
}
