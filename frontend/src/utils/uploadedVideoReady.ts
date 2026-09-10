import { he } from "../i18n/he";
import { isVercelBlobMediaUrl } from "./mediaUrl";
import { nextMediaRetryDelayMs, sleepMs } from "./mediaRetry";

export function remoteVideoUrls(
  attachments: Array<{ kind: string; url?: string | null }>,
): string[] {
  return attachments
    .filter((item) => item.kind === "video" && isVercelBlobMediaUrl(item.url || ""))
    .map((item) => item.url as string);
}

export async function waitUntilRemoteVideosReady(
  urls: string[],
  check: (url: string) => Promise<boolean>,
  opts?: {
    wait?: (ms: number) => Promise<void>;
    maxAttempts?: number;
  },
): Promise<void> {
  if (!urls.length) return;
  const wait = opts?.wait ?? sleepMs;
  const maxAttempts = opts?.maxAttempts ?? 12;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const flags = await Promise.all(urls.map((url) => check(url)));
    if (flags.every(Boolean)) return;
    const delay = nextMediaRetryDelayMs(Math.min(attempt, 2)) ?? 5000;
    await wait(delay);
  }
  throw new Error(he.completionVideosNotReady);
}
