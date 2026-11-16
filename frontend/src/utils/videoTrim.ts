import { pickVideoRecorderMimeType, videoRecorderOptions } from "./mediaCapture";
import type { TrimRange } from "./flowTrim";

/**
 * Découpe d'une vidéo filmée, sur l'appareil : la portion choisie est relue puis réenregistrée.
 * Dure aussi longtemps que la portion conservée (lecture en temps réel), sans bibliothèque externe.
 */

export type TrimResult = { file: File; durationSeconds: number };

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream };

export type TrimDeps = {
  createVideo: () => CapturableVideo;
  createRecorder: (stream: MediaStream) => MediaRecorder;
  pollMs: number;
};

export const defaultTrimDeps: TrimDeps = {
  createVideo: () => document.createElement("video") as CapturableVideo,
  createRecorder: (stream) => new MediaRecorder(stream, videoRecorderOptions(pickVideoRecorderMimeType())),
  pollMs: 50,
};

export class TrimUnsupportedError extends Error {
  constructor() {
    super("trim-unsupported");
  }
}

function once(target: EventTarget, event: string, fail = "error"): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      target.removeEventListener(event, done);
      target.removeEventListener(fail, failed);
      resolve();
    };
    const failed = () => {
      target.removeEventListener(event, done);
      target.removeEventListener(fail, failed);
      reject(new Error("trim-load-failed"));
    };
    target.addEventListener(event, done);
    target.addEventListener(fail, failed);
  });
}

async function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  const seeked = once(video, "seeked");
  video.currentTime = seconds;
  await seeked;
}

/** Attend que la lecture atteigne `end` (ou la fin du fichier) ; abandonne si elle se bloque. */
function waitUntil(video: HTMLVideoElement, end: number, durationMs: number, pollMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (video.currentTime >= end || video.ended) {
        window.clearInterval(timer);
        resolve();
      } else if (Date.now() - started > durationMs) {
        window.clearInterval(timer);
        reject(new Error("trim-timeout"));
      }
    }, pollMs);
  });
}

export function extensionFor(mimeType: string): string {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function recordInto(recorder: MediaRecorder): Promise<Blob> {
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  return new Promise((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || "video/webm" }));
    recorder.onerror = () => reject(new Error("trim-record-failed"));
  });
}

async function openSource(src: string, deps: TrimDeps) {
  const video = deps.createVideo();
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const loaded = once(video, "loadedmetadata");
  video.src = src;
  await loaded;
  if (typeof video.captureStream !== "function") throw new TrimUnsupportedError();
  return video;
}

function release(video: HTMLVideoElement, stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
  video.pause();
  video.removeAttribute("src");
  video.load();
}

export async function trimVideo(src: string, range: TrimRange, deps: TrimDeps = defaultTrimDeps): Promise<TrimResult> {
  const seconds = range.end - range.start;
  const video = await openSource(src, deps);
  let stream: MediaStream | null = null;
  try {
    await seekTo(video, range.start);
    stream = video.captureStream!();
    const recorder = deps.createRecorder(stream);
    const finished = recordInto(recorder);
    recorder.start(250);
    await video.play();
    await waitUntil(video, range.end, seconds * 1000 + 5000, deps.pollMs);
    video.pause();
    if (recorder.state !== "inactive") recorder.stop();
    const blob = await finished;
    const file = new File([blob], `trim-${Date.now()}.${extensionFor(blob.type)}`, { type: blob.type });
    return { file, durationSeconds: Math.round(seconds * 10) / 10 };
  } finally {
    release(video, stream);
  }
}
