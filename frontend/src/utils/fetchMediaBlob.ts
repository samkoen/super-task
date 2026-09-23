import { mediaUrl, withStreamQuery } from "./mediaUrl";
import {
  isRetryableMediaError,
  nextMediaRetryDelayMs,
  sleepMs,
} from "./mediaRetry";
import { playableMediaBlob, shouldStreamVideoOnWeb } from "./videoPlayback";

export { withStreamQuery } from "./mediaUrl";

export type FetchMediaBlobOptions = { stream?: boolean };

export async function fetchMediaBlob(
  path: string,
  options?: FetchMediaBlobOptions,
): Promise<Blob> {
  const url = mediaUrl(path);
  if (!url) throw new Error("empty media path");
  const stream = resolveStream(path, options);
  const response = await fetch(stream ? withStreamQuery(url) : url, {
    credentials: "include",
    redirect: stream || shouldFollowRedirect(path) ? "follow" : "manual",
  });
  if (isRedirect(response.status)) {
    return playableMediaBlob(await fetchRedirectedBlob(response), path);
  }
  if (!response.ok) throw new Error(`media fetch failed: ${response.status}`);
  return playableMediaBlob(await response.blob(), path);
}

function resolveStream(path: string, options?: FetchMediaBlobOptions): boolean {
  if (options?.stream != null) return options.stream;
  return shouldStreamVideoOnWeb(path);
}

function shouldFollowRedirect(path: string): boolean {
  return path.startsWith("/uploads/") || path.startsWith("blob:");
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function fetchRedirectedBlob(response: Response): Promise<Blob> {
  const location = response.headers.get("Location");
  if (!location) throw new Error("media fetch failed: redirect");
  const next = await fetch(location);
  if (!next.ok) throw new Error(`media fetch failed: ${next.status}`);
  return next.blob();
}

export async function fetchMediaBlobWithRetry(
  path: string,
  wait: (ms: number) => Promise<void> = sleepMs,
  options?: FetchMediaBlobOptions,
): Promise<Blob> {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchMediaBlob(path, options);
    } catch (error) {
      const delay = nextMediaRetryDelayMs(attempt);
      if (delay == null || !isRetryableMediaError(error)) throw error;
      attempt += 1;
      await wait(delay);
    }
  }
}
