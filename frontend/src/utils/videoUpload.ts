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

export type VideoUploadIntent =
  | { mode: "proxy" }
  | {
      mode: "direct";
      pathname: string;
      token: string;
      access: "private" | "public";
      apiUrl: string;
      apiVersion: string;
      kind: "video";
    };

export function blobPutUrl(apiUrl: string, pathname: string): string {
  const url = new URL(apiUrl);
  url.searchParams.set("pathname", pathname);
  return url.toString();
}

/** Chrome MediaRecorder sends video/webm;codecs=vp9,opus — Blob only allows video/webm. */
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

function isRetryableBlobPutError(error: unknown): boolean {
  return isFetchInterruptedError(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function requestVideoIntent(
  purpose: VideoUploadPurpose,
  contentType: string,
): Promise<VideoUploadIntent> {
  const { data } = await api.post<VideoUploadIntent>("/media/video-intent", {
    purpose,
    content_type: bareVideoContentType(contentType, "video/mp4"),
  });
  return data;
}

export function blobPutHeaders(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
): Record<string, string> {
  return {
    authorization: `Bearer ${intent.token}`,
    "x-api-version": intent.apiVersion,
    "x-content-type": bareVideoContentType(file.type, "video/mp4"),
    "x-add-random-suffix": "0",
    "x-vercel-blob-access": intent.access,
  };
}

async function readBlobPutResponse(response: Response): Promise<{ url: string; kind: string }> {
  if (!response.ok) {
    throw new Error("upload failed");
  }
  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("upload failed");
  }
  return { url: data.url, kind: "video" };
}

async function putViaAndroid(url: string, headers: Record<string, string>, file: File) {
  const path = nativeMediaPath(file) ?? (await writeFileToNativeCache(file));
  const uploaded = await putBlobFromNativePath(path, url, headers);
  return { url: uploaded.url, kind: "video" as const };
}

export async function putBlobWithClientToken(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
  doFetch?: typeof fetch,
): Promise<{ url: string; kind: string }> {
  const uploadFile = fileForBlobVideoUpload(file);
  const url = blobPutUrl(intent.apiUrl, intent.pathname);
  const headers = blobPutHeaders(intent, uploadFile);
  if (!doFetch && canUseNativeBlobUpload()) {
    return putViaAndroid(url, headers, uploadFile);
  }
  return putBlobViaFetch(url, headers, uploadFile, doFetch ?? fetch);
}

async function putBlobViaFetch(
  url: string,
  headers: Record<string, string>,
  file: File,
  doFetch: typeof fetch,
): Promise<{ url: string; kind: string }> {
  let lastError: unknown;
  for (const waitMs of [0, 400, 1200]) {
    if (waitMs > 0) await delay(waitMs);
    try {
      const response = await doFetch(url, { method: "PUT", headers, body: file });
      return await readBlobPutResponse(response);
    } catch (error) {
      lastError = error;
      if (!isFetchInterruptedError(error)) throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to fetch");
}

/** Vite / uvicorn local : pas de PUT navigateur vers vercel.com (CORS). L'APK prod n'est pas DEV. */
export function shouldUseLocalVideoProxy(isDev: boolean): boolean {
  return isDev;
}

/** Proxy multipart seulement en Vite. Prod web (Render) : PUT Blob, proxy en repli. */
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
  const intent = await requestVideoIntent(purpose, uploadFile.type).catch(
    (): VideoUploadIntent => ({ mode: "proxy" }),
  );
  if (intent.mode !== "direct") {
    siyumTrace("video-upload-proxy", { reason: "intent-proxy" });
    return proxyUpload(uploadFile);
  }
  try {
    const uploaded = await putBlobWithClientToken(intent, uploadFile, doFetch);
    siyumTrace("video-upload-blob-ok");
    return uploaded;
  } catch (error) {
    if (!isRetryableBlobPutError(error)) throw error;
    siyumTrace("video-upload-proxy", { reason: "blob-put-failed-fetch" });
    return proxyUpload(uploadFile);
  }
}
