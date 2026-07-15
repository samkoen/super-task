import { useCallback, useEffect, useRef, useState } from "react";
import type { EmployeeLanguage } from "../domain/employeeLanguages";
import { SPEECH_LOCALES } from "../domain/employeeLanguages";
import { aiService } from "../services/aiService";
import { pickSpeechVoice, waitForSpeechVoices } from "../utils/speechVoice";

export function useTaskSpeech(defaultLanguage: EmployeeLanguage = "he") {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const browserSupported =
    typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined";

  const cleanupAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
    cleanupAudio();
    setSpeakingId(null);
    utteranceRef.current = null;
  }, [browserSupported, cleanupAudio]);

  useEffect(() => {
    if (!browserSupported) return;
    void waitForSpeechVoices();
    void aiService.getStatus().then((status) => setTtsAvailable(Boolean(status.tts_available)));
    return () => stop();
  }, [browserSupported, stop]);

  const speakWithBrowser = useCallback(
    async (taskId: string, text: string, language: EmployeeLanguage) => {
      if (!browserSupported) return false;
      const voices = await waitForSpeechVoices();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      const voice = pickSpeechVoice(voices, language);
      utterance.lang = voice?.lang || SPEECH_LOCALES[language] || SPEECH_LOCALES.he;
      if (voice) utterance.voice = voice;
      utterance.onend = () => setSpeakingId(null);
      utterance.onerror = () => setSpeakingId(null);
      utteranceRef.current = utterance;
      setSpeakingId(taskId);
      window.speechSynthesis.speak(utterance);
      return Boolean(voice || voices.length > 0);
    },
    [browserSupported]
  );

  const speakWithAi = useCallback(
    async (taskId: string, text: string, language: EmployeeLanguage) => {
      const blob = await aiService.speakTask(text, language);
      cleanupAudio();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setSpeakingId(taskId);
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setSpeakingId(null);
          cleanupAudio();
          resolve();
        };
        audio.onerror = () => {
          setSpeakingId(null);
          cleanupAudio();
          reject(new Error("audio-playback-failed"));
        };
        void audio.play().catch(reject);
      });
      return true;
    },
    [cleanupAudio]
  );

  const speak = useCallback(
    async (taskId: string, text: string, language: EmployeeLanguage = defaultLanguage) => {
      if (!text.trim()) return false;
      stop();
      const useAi = ttsAvailable && language !== "he";
      if (useAi) {
        try {
          await speakWithAi(taskId, text, language);
          return true;
        } catch {
          if (browserSupported) {
            return speakWithBrowser(taskId, text, language);
          }
          return false;
        }
      }
      if (browserSupported) {
        return speakWithBrowser(taskId, text, language);
      }
      return false;
    },
    [browserSupported, defaultLanguage, speakWithAi, speakWithBrowser, stop, ttsAvailable]
  );

  return { supported: browserSupported || ttsAvailable, ttsAvailable, speakingId, speak, stop };
}
