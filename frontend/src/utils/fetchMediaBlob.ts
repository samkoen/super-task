import { mediaUrl } from "./mediaUrl";
import {
  isRetryableMediaError,
  nextMediaRetryDelayMs,
  sleepMs,
} from "./mediaRetry";

export async function fetchMediaBlob(path: string): Promise<Blob> {
  const url = mediaUrl(path);
  if (!url) throw new Error("empty media path");
  const response = await fetch(url, { credentials: "include", redirect: "manual" });
  if (isRedirect(response.status)) {
    return fetchRedirectedBlob(response);
  }
  if (!response.ok) throw new Error(`media fetch failed: ${response.status}`);
  return response.blob();
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
): Promise<Blob> {
  let attempt = 0;
  for (;;) {
    try {
      return await fetchMediaBlob(path);
    } catch (error) {
      const delay = nextMediaRetryDelayMs(attempt);
      if (delay == null || !isRetryableMediaError(error)) throw error;
      attempt += 1;
      await wait(delay);
    }
  }
}
