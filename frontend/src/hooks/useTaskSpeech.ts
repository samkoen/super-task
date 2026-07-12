import { useCallback, useEffect, useRef, useState } from "react";
import type { EmployeeLanguage } from "../domain/employeeLanguages";
import { SPEECH_LOCALES } from "../domain/employeeLanguages";

export function useTaskSpeech(language: EmployeeLanguage = "he") {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeakingId(null);
    utteranceRef.current = null;
  }, [supported]);

  useEffect(() => () => stop(), [stop]);

  const speak = useCallback(
    (taskId: string, text: string) => {
      if (!supported || !text.trim()) return;
      stop();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = SPEECH_LOCALES[language] || SPEECH_LOCALES.he;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      utteranceRef.current = utterance;
      setSpeakingId(taskId);
      window.speechSynthesis.speak(utterance);
    },
    [language, stop, supported]
  );

  return { supported, speakingId, speak, stop };
}
