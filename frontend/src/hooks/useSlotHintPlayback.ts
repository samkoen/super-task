import { useCallback, useRef, useState } from "react";
import type { EmployeeLanguage } from "../domain/employeeLanguages";
import { aiService } from "../services/aiService";
import { resolveLocalizedHint } from "../utils/localizedHint";
import { useTaskSpeech } from "./useTaskSpeech";

export function useSlotHintPlayback(language: EmployeeLanguage = "he") {
  const { speak: speakText, stop, speakingId, supported } = useTaskSpeech(language);
  const cacheRef = useRef(new Map<string, string>());
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const localized = useCallback(
    async (hint: string) =>
      resolveLocalizedHint(hint, language, (text, lang) => aiService.translateText(text, lang), cacheRef.current),
    [language],
  );

  const show = useCallback(
    async (id: string, hint: string, title: string) => {
      setLoadingId(id);
      try {
        const text = await localized(hint);
        setDialog({ title, text });
      } finally {
        setLoadingId(null);
      }
    },
    [localized],
  );

  const speak = useCallback(
    async (id: string, hint: string) => {
      if (speakingId === id) {
        stop();
        return;
      }
      setLoadingId(id);
      try {
        const text = await localized(hint);
        await speakText(id, text, language);
      } finally {
        setLoadingId(null);
      }
    },
    [language, localized, speakText, speakingId, stop],
  );

  return {
    show,
    speak,
    speakingId,
    loadingId,
    dialog,
    closeDialog: () => setDialog(null),
    supported,
  };
}
