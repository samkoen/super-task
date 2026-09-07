import { mediaUrl } from "./mediaUrl";
import {
  isRetryableMediaError,
  nextMediaRetryDelayMs,
  sleepMs,
} from "./mediaRetry";

export async function fetchMediaBlob(path: string): Promise<Blob> {
  const url = mediaUrl(path);
  if (!url) throw new Error("empty media path");
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`media fetch failed: ${response.status}`);
  return response.blob();
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
