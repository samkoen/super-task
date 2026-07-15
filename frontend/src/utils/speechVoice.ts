import type { EmployeeLanguage } from "../domain/employeeLanguages";
import { SPEECH_LOCALES } from "../domain/employeeLanguages";

export const SPEECH_LOCALE_CANDIDATES: Record<EmployeeLanguage, string[]> = {
  he: ["he-IL", "he"],
  ar: ["ar-SA", "ar-EG", "ar-AE", "ar-KW", "ar"],
  th: ["th-TH", "th"],
  fr: ["fr-FR", "fr-CA", "fr"],
  en: ["en-US", "en-GB", "en"],
};

export function speechLocaleCandidates(language: EmployeeLanguage): string[] {
  return SPEECH_LOCALE_CANDIDATES[language] ?? [SPEECH_LOCALES.he];
}

export function pickSpeechVoice(
  voices: SpeechSynthesisVoice[],
  language: EmployeeLanguage
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const candidates = speechLocaleCandidates(language);
  for (const locale of candidates) {
    const exact = voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase());
    if (exact) return exact;
  }
  const base = candidates[0]?.split("-")[0]?.toLowerCase();
  if (base) {
    const partial = voices.find((voice) => voice.lang.toLowerCase().startsWith(`${base}-`));
    if (partial) return partial;
  }
  return null;
}

export function resolveSpeechLanguage(
  employeeLanguage: EmployeeLanguage,
  displayLanguage?: string,
  translationPending?: boolean
): EmployeeLanguage {
  if (translationPending) return "he";
  const code = (displayLanguage || employeeLanguage || "he") as EmployeeLanguage;
  if (code in SPEECH_LOCALES) return code;
  return employeeLanguage;
}

export async function waitForSpeechVoices(timeoutMs = 2500): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  const existing = window.speechSynthesis.getVoices();
  if (existing.length) return existing;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    const onChange = () => {
      if (window.speechSynthesis.getVoices().length) finish();
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    window.setTimeout(finish, timeoutMs);
  });
}
