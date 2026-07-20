import { useCallback, useRef, useState } from "react";
import { classifyMediaError } from "../utils/mediaCapture";

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    setBlob(null);
    setError("");
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("unsupported");
      return;
    }
    setError("");
    setBlob(null);
    try {
      const { ensureNativeAvPermissions } = await import("../plugins/mediaPermissions");
      const granted = await ensureNativeAvPermissions({ camera: false, microphone: true });
      if (!granted) {
        setError("permission");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const next = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setBlob(next);
        cleanupStream();
        setRecording(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (caught) {
      cleanupStream();
      setError(classifyMediaError(caught));
    }
  }, [cleanupStream, supported]);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      setRecording(false);
      cleanupStream();
    }
  }, [cleanupStream]);

  return { supported, recording, blob, error, start, stop, reset };
}
