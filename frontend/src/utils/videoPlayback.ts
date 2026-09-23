import { isNativeApp } from "./isNativeApp";

const VIDEO_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mpeg: "video/mpeg",
  mpg: "video/mpeg",
};

export function videoExtension(path: string): string | null {
  const clean = path.split("?")[0].split("#")[0].toLowerCase();
  const dot = clean.lastIndexOf(".");
  if (dot < 0) return null;
  const ext = clean.slice(dot + 1);
  return ext in VIDEO_TYPES ? ext : null;
}

export function isVideoMediaPath(path: string): boolean {
  return videoExtension(path) != null;
}

/** Chrome refuse le 302 du proxy (pas de Content-Type). L'app Android garde ce proxy. */
export function shouldStreamVideoOnWeb(path: string, native = isNativeApp()): boolean {
  return !native && isVideoMediaPath(path);
}

/** Chrome ne lit pas un blob vidéo sans type video/*. Android reçoit le blob d'origine. */
export function playableMediaBlob(blob: Blob, path: string, native = isNativeApp()): Blob {
  if (native || !isVideoMediaPath(path) || blob.type.startsWith("video/")) return blob;
  const ext = videoExtension(path);
  const type = ext ? VIDEO_TYPES[ext] : "";
  if (!type) return blob;
  return new Blob([blob], { type });
}
