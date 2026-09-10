export const VIDEO_SLOT_IDLE_MS = 300;

export function isVideoPending(media: { file: File | null }): boolean {
  if (!media.file || media.file.size <= 0) return false;
  return media.file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(media.file.name);
}

export function pendingVideoSlots<T extends { file: File | null; previewUrl: string }>(
  slots: Array<T | null>,
): T[] {
  return slots.filter((item): item is T => Boolean(item && isVideoPending(item)));
}

export function waitForCaptureUiIdle(
  delayMs = VIDEO_SLOT_IDLE_MS,
  wait: (ms: number) => Promise<void> = sleepMs,
): Promise<void> {
  return new Promise((resolve) => {
    const rest = () => {
      void wait(delayMs).then(resolve);
    };
    if (typeof requestAnimationFrame !== "function") {
      rest();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(rest));
  });
}

/** Ne pas appeler video.load() : ça détache le blob partagé dans le WebView Android. */
export function releaseVideoElement(video: HTMLVideoElement): void {
  video.onloadeddata = null;
  video.onerror = null;
  video.removeAttribute("src");
  video.remove();
}

export function waitUntilVideoCanPlay(previewUrl: string, timeoutMs = 8000): Promise<void> {
  if (!previewUrl) return Promise.resolve();
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "auto";
    const finish = () => {
      window.clearTimeout(timer);
      releaseVideoElement(video);
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    video.onloadeddata = finish;
    video.onerror = finish;
    video.src = previewUrl;
  });
}

export async function waitUntilPendingVideosReady<T extends { file: File | null; previewUrl: string }>(
  slots: Array<T | null>,
  opts?: {
    idleMs?: number;
    canPlay?: (url: string) => Promise<void>;
    wait?: (ms: number) => Promise<void>;
  },
): Promise<void> {
  const videos = pendingVideoSlots(slots);
  if (!videos.length) return;
  await waitForCaptureUiIdle(opts?.idleMs, opts?.wait);
  const canPlay = opts?.canPlay ?? waitUntilVideoCanPlay;
  await Promise.all(videos.map((item) => canPlay(item.previewUrl)));
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
