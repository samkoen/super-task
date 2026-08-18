import { he } from "../i18n/he";

/** Texte sous un audio : תמלול réel, ou message d’échec si autorisé. */
export function displayedAudioTranscript(
  transcript: string | null | undefined,
  opts: { hasAudio: boolean; allowFallback?: boolean },
): string | null {
  const text = (transcript || "").trim();
  if (text) return text;
  if (opts.hasAudio && opts.allowFallback !== false) {
    return he.audioTranscriptionFailed;
  }
  return null;
}
