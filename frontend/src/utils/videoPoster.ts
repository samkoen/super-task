/** Première image d'une vidéo (blob ou URL) pour l'aperçu de case. */

export async function captureVideoPoster(src: string): Promise<string | null> {
  if (!src) return null;
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  return new Promise((resolve) => {
    let settled = false;
    const finish = (url: string | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      resolve(url);
    };
    const timer = window.setTimeout(() => finish(frameToJpeg(video)), 2000);
    video.addEventListener("error", () => finish(null), { once: true });
    video.addEventListener("seeked", () => finish(frameToJpeg(video)), { once: true });
    video.addEventListener(
      "loadeddata",
      () => {
        try {
          video.currentTime = Math.min(0.1, Number.isFinite(video.duration) ? video.duration * 0.01 : 0.1);
        } catch {
          finish(frameToJpeg(video));
        }
      },
      { once: true },
    );
    video.src = src;
  });
}

function frameToJpeg(video: HTMLVideoElement): string | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0);
  try {
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}
