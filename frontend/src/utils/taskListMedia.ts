/** Médias hors photo de fond : à charger seulement à l'ouverture de la tâche. */

export interface TaskMediaFlags {
  hasReferenceVideo: boolean;
  hasReferenceAudio: boolean;
  /** Photo de référence hors fond de carte (aperçu détaillé). */
  hasReferencePhoto: boolean;
  hasCompletionPhoto: boolean;
  hasCompletionVideo: boolean;
  hasCompletionAudio: boolean;
}

export function taskMediaFlags(task: {
  reference_photo_url?: string | null;
  reference_video_url?: string | null;
  reference_audio_url?: string | null;
  completion?: {
    photo_path?: string | null;
    video_path?: string | null;
    audio_path?: string | null;
  } | null;
}): TaskMediaFlags {
  const c = task.completion;
  return {
    hasReferencePhoto: Boolean(task.reference_photo_url?.trim()),
    hasReferenceVideo: Boolean(task.reference_video_url?.trim()),
    hasReferenceAudio: Boolean(task.reference_audio_url?.trim()),
    hasCompletionPhoto: Boolean(c?.photo_path?.trim()),
    hasCompletionVideo: Boolean(c?.video_path?.trim()),
    hasCompletionAudio: Boolean(c?.audio_path?.trim()),
  };
}

/** true s'il y a vidéo/audio (référence ou clôture) à ne pas charger dans la liste. */
export function hasDeferredTaskMedia(task: Parameters<typeof taskMediaFlags>[0]): boolean {
  const f = taskMediaFlags(task);
  return (
    f.hasReferenceVideo ||
    f.hasReferenceAudio ||
    f.hasCompletionPhoto ||
    f.hasCompletionVideo ||
    f.hasCompletionAudio
  );
}
