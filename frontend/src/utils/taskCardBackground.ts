import { mediaUrl } from "./mediaUrl";

/** URL de fond pour une carte tâche (photo de référence), ou null. */
export function taskCardBackgroundUrl(referencePhotoUrl?: string | null): string | null {
  return mediaUrl(referencePhotoUrl);
}
