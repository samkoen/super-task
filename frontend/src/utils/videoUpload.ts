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

export async function requestVideoIntent(
  purpose: VideoUploadPurpose,
  contentType: string,
): Promise<VideoUploadIntent> {
  const { data } = await api.post<VideoUploadIntent>("/media/video-intent", {
    purpose,
    content_type: contentType || "video/mp4",
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
    "x-content-type": file.type || "video/mp4",
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
  const url = blobPutUrl(intent.apiUrl, intent.pathname);
  const headers = blobPutHeaders(intent, file);
  if (!doFetch && canUseNativeBlobUpload()) {
    return putViaAndroid(url, headers, file);
  }
  const response = await (doFetch ?? fetch)(url, { method: "PUT", headers, body: file });
  return readBlobPutResponse(response);
}

/** Vite / uvicorn local : pas de PUT navigateur vers vercel.com (CORS). L'APK prod n'est pas DEV. */
export function shouldUseLocalVideoProxy(isDev: boolean): boolean {
  return isDev;
}

export async function uploadVideoFile(
  file: File,
  purpose: VideoUploadPurpose,
  proxyUpload: (file: File) => Promise<{ url: string }>,
  doFetch?: typeof fetch,
  isDev = Boolean(import.meta.env.DEV),
): Promise<{ url: string }> {
  const intent = await requestVideoIntent(purpose, file.type).catch(
    (): VideoUploadIntent => ({ mode: "proxy" }),
  );
  if (intent.mode !== "direct" || (!doFetch && shouldUseLocalVideoProxy(isDev))) {
    return proxyUpload(file);
  }
  return putBlobWithClientToken(intent, file, doFetch);
}
