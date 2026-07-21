import type { TaskReferenceMediaValue } from "../components/tasks/TaskReferenceMediaEditor";

/** Construit les médias de référence à partir d’une photo capturée (étape caméra). */
export function mediaFromPhotoFile(file: File): TaskReferenceMediaValue {
  return {
    reference_photo_url: URL.createObjectURL(file),
    reference_video_url: "",
    reference_audio_url: "",
    pending_photo: file,
    pending_video: null,
  };
}

export function revokeTaskMediaBlobs(media: TaskReferenceMediaValue): void {
  for (const url of [
    media.reference_photo_url,
    media.reference_video_url,
    media.reference_audio_url,
  ]) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  }
}
