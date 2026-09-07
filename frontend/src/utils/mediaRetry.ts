/** Délais de retry quand le proxy média répond trop tôt (blob / ACL). */
export const MEDIA_RETRY_DELAYS_MS = [300, 1000, 3000] as const;

export function nextMediaRetryDelayMs(attempt: number): number | null {
  return MEDIA_RETRY_DELAYS_MS[attempt] ?? null;
}

export function isRetryableMediaStatus(status: number): boolean {
  return status === 403 || status === 404 || status >= 500;
}

export function isRetryableMediaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  const match = /media fetch failed: (\d+)/.exec(message);
  if (!match) return true;
  return isRetryableMediaStatus(Number(match[1]));
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
