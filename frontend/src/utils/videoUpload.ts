import { he } from "../i18n/he";
import { isFetchInterruptedError } from "./apiErrorMessage";
import { isNativeApp } from "./isNativeApp";
import { siyumTrace } from "./siyumTrace";
import api from "../services/api";
import {
  canUseNativeBlobUpload,
  putBlobFromNativePath,
  writeFileToNativeCache,
} from "../plugins/nativeBlobUpload";
import { nativeMediaPath } from "./nativeMediaPath";

export type VideoUploadPurpose = "task" | "chat" | "issue";

/** Aligné sur backend VIDEO_MAX_BYTES — le PUT R2 signe aussi ContentLength. */
export const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

export type VideoUploadIntent =
  | { mode: "proxy" }
  | {
      mode: "direct";
      putUrl: string;
      headers: Record<string, string>;
      url: string;
      pathname: string;
      kind: "video";
    };

/** Chrome MediaRecorder sends video/webm;codecs=vp9,opus — R2 signe video/webm. */
export function bareVideoContentType(type: string, fallback = "video/webm"): string {
  return (type || "").split(";")[0].trim().toLowerCase() || fallback;
}

export function fileForBlobVideoUpload(file: File): File {
  const type = bareVideoContentType(file.type);
  if (file.type === type) return file;
  return new File([file], file.name, { type, lastModified: file.lastModified });
}

export async function snapshotMediaFile(file: File): Promise<File> {
  const buffer = await readFileBytes(file);
  return new File([buffer], file.name, { type: file.type, lastModified: file.lastModified });
}

export async function readFileBytes(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return readFileBytesWithReader(file);
}

function readFileBytesWithReader(file: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error ?? new Error("file"));
    reader.readAsArrayBuffer(file);
  });
}

function isRetryableDirectPutError(error: unknown): boolean {
  return isFetchInterruptedError(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function requestVideoIntent(
  purpose: VideoUploadPurpose,
  contentType: string,
  size: number,
): Promise<VideoUploadIntent> {
  const { data } = await api.post<VideoUploadIntent>("/media/video-intent", {
    purpose,
    content_type: bareVideoContentType(contentType, "video/mp4"),
    size,
  });
  return data;
}

export function assertVideoWithinMaxBytes(size: number, maxBytes = VIDEO_MAX_BYTES): void {
  if (size < 1 || size > maxBytes) {
    throw new Error(he.errorRequestTooLarge);
  }
}

export function directPutHeaders(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
): Record<string, string> {
  return {
    ...intent.headers,
    "Content-Type": bareVideoContentType(file.type, intent.headers["Content-Type"] || "video/mp4"),
  };
}

async function readDirectPutResponse(
  response: Response,
  objectUrl: string,
): Promise<{ url: string; kind: string }> {
  if (!response.ok) {
    throw new Error("upload failed");
  }
  return { url: objectUrl, kind: "video" };
}

async function putViaAndroid(
  url: string,
  headers: Record<string, string>,
  file: File,
  objectUrl: string,
) {
  const path = nativeMediaPath(file) ?? (await writeFileToNativeCache(file));
  await putBlobFromNativePath(path, url, headers);
  return { url: objectUrl, kind: "video" as const };
}

export async function putDirectVideo(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
  doFetch?: typeof fetch,
): Promise<{ url: string; kind: string }> {
  const uploadFile = fileForBlobVideoUpload(file);
  const headers = directPutHeaders(intent, uploadFile);
  if (!doFetch && canUseNativeBlobUpload()) {
    return putViaAndroid(intent.putUrl, headers, uploadFile, intent.url);
  }
  return putDirectViaFetch(intent.putUrl, headers, uploadFile, intent.url, doFetch ?? fetch);
}

async function putDirectViaFetch(
  url: string,
  headers: Record<string, string>,
  file: File,
  objectUrl: string,
  doFetch: typeof fetch,
): Promise<{ url: string; kind: string }> {
  let lastError: unknown;
  for (const waitMs of [0, 400, 1200]) {
    if (waitMs > 0) await delay(waitMs);
    try {
      const response = await doFetch(url, { method: "PUT", headers, body: file });
      return await readDirectPutResponse(response, objectUrl);
    } catch (error) {
      lastError = error;
      if (!isRetryableDirectPutError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch");
}

/** Vite / uvicorn local : pas de PUT navigateur vers R2. */
export function shouldUseLocalVideoProxy(isDev: boolean): boolean {
  return isDev;
}

export function shouldUseSameOriginVideoProxy(isDev: boolean, _native = false): boolean {
  return isDev;
}

export async function uploadVideoFile(
  file: File,
  purpose: VideoUploadPurpose,
  proxyUpload: (file: File) => Promise<{ url: string }>,
  doFetch?: typeof fetch,
  isDev = Boolean(import.meta.env.DEV),
  native = isNativeApp(),
): Promise<{ url: string }> {
  assertVideoWithinMaxBytes(file.size);
  const uploadFile = await snapshotMediaFile(fileForBlobVideoUpload(file));
  siyumTrace("video-upload-start", {
    bytes: uploadFile.size,
    purpose,
    isDev,
    native,
  });
  if (!doFetch && shouldUseSameOriginVideoProxy(isDev, native)) {
    siyumTrace("video-upload-proxy", { reason: "skip-browser-blob-put" });
    return proxyUpload(uploadFile);
  }
  const intent = await requestVideoIntent(purpose, uploadFile.type, uploadFile.size).catch(
    (): VideoUploadIntent => ({ mode: "proxy" }),
  );
  if (intent.mode !== "direct") {
    siyumTrace("video-upload-proxy", { reason: "intent-proxy" });
    return proxyUpload(uploadFile);
  }
  try {
    const uploaded = await putDirectVideo(intent, uploadFile, doFetch);
    siyumTrace("video-upload-blob-ok");
    return uploaded;
  } catch (error) {
    if (!isRetryableDirectPutError(error)) throw error;
    siyumTrace("video-upload-proxy", { reason: "blob-put-failed-fetch" });
    return proxyUpload(uploadFile);
  }
}

/** @deprecated alias tests / APK */
export const putBlobWithClientToken = putDirectVideo;
export const blobPutHeaders = directPutHeaders;
