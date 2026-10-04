const PHOTO_EXT = /\.(jpe?g|png|webp|gif|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|3gp)$/i;

/** Photo ou vidéo choisie dans les fichiers, pas via la caméra. */
export function referenceFileKind(file: File): "photo" | "video" | null {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) return "photo";
  if (type.startsWith("video/")) return "video";
  if (PHOTO_EXT.test(file.name)) return "photo";
  if (VIDEO_EXT.test(file.name)) return "video";
  return null;
}
