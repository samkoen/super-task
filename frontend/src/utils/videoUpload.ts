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

/** fetch du WebView, pas CapacitorHttp — évite de recharger la vidéo en base64. */
export function unpatchedFetch(): typeof fetch {
  const fromFrame = iframeWindowFetch();
  return fromFrame ?? fetch.bind(globalThis);
}

function iframeWindowFetch(): typeof fetch | null {
  if (typeof document === "undefined") return null;
  try {
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.display = "none";
    document.documentElement.appendChild(frame);
    const child = frame.contentWindow?.fetch;
    const bound = typeof child === "function" ? child.bind(frame.contentWindow) : null;
    frame.remove();
    return bound;
  } catch {
    return null;
  }
}

function blobPutHeaders(
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

export async function putBlobWithClientToken(
  intent: Extract<VideoUploadIntent, { mode: "direct" }>,
  file: File,
  doFetch: typeof fetch = unpatchedFetch(),
): Promise<{ url: string; kind: string }> {
  const response = await doFetch(blobPutUrl(intent.apiUrl, intent.pathname), {
    method: "PUT",
    headers: blobPutHeaders(intent, file),
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
  doFetch: typeof fetch = unpatchedFetch(),
): Promise<{ url: string }> {
  const intent = await requestVideoIntent(purpose, file.type).catch(
    (): VideoUploadIntent => ({ mode: "proxy" }),
  );
  if (intent.mode === "direct") {
    return putBlobWithClientToken(intent, file, doFetch);
  }
  return proxyUpload(file);
}
