import api from "../services/api";

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

export async function putBlobWithClientToken(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
): Promise<{ url: string; kind: string }> {
  const response = await fetch(blobPutUrl(intent.apiUrl, intent.pathname), {
    method: "PUT",
    headers: {
      authorization: `Bearer ${intent.token}`,
      "x-api-version": intent.apiVersion,
      "x-content-type": file.type || "video/mp4",
      "x-add-random-suffix": "0",
      "x-vercel-blob-access": intent.access,
    },
    body: file,
  });
  if (!response.ok) {
    throw new Error("upload failed");
  }
  const data = (await response.json()) as { url?: string };
  if (!data.url) {
    throw new Error("upload failed");
  }
  return { url: data.url, kind: "video" };
}

export async function uploadVideoFile(
  file: File,
  purpose: VideoUploadPurpose,
  proxyUpload: (file: File) => Promise<{ url: string }>,
): Promise<{ url: string }> {
  const intent = await requestVideoIntent(purpose, file.type).catch(
    (): VideoUploadIntent => ({ mode: "proxy" }),
  );
  if (intent.mode === "direct") {
    return putBlobWithClientToken(intent, file);
  }
  return proxyUpload(file);
}
