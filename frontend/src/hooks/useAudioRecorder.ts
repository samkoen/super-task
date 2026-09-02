import { useCallback, useEffect, useRef, useState } from "react";
import { classifyMediaError } from "../utils/mediaCapture";

function assembleAudioBlob(chunks: Blob[], mimeType: string) {
  return new Blob(chunks, { type: mimeType || "audio/webm" });
}

function bindAudioRecorder(
  recorder: MediaRecorder,
  chunks: Blob[],
  waiters: Array<(blob: Blob | null) => void>,
  cleanupStream: () => void,
  setBlob: (blob: Blob | null) => void,
  setRecording: (value: boolean) => void,
  setPaused: (value: boolean) => void,
) {
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
    const next = assembleAudioBlob(chunks, recorder.mimeType);
    if (next.size > 0) setBlob(next);
  };
  recorder.onstop = () => {
    const next = assembleAudioBlob(chunks, recorder.mimeType);
    setBlob(next.size > 0 ? next : null);
    cleanupStream();
    setRecording(false);
    setPaused(false);
    waiters.splice(0).forEach((resolve) => resolve(next.size > 0 ? next : null));
  };
}

export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const waitersRef = useRef<Array<(blob: Blob | null) => void>>([]);

  const supported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined";

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const setBlobAndRef = useCallback((next: Blob | null) => {
    blobRef.current = next;
    setBlob(next);
  }, []);

  useEffect(() => {
    if (!recording || paused) return;
    const id = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording, paused]);

  const reset = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => {
        cleanupStream();
        setRecording(false);
        setPaused(false);
        waitersRef.current.splice(0).forEach((resolve) => resolve(null));
      };
      recorder.stop();
    } else {
      cleanupStream();
      setRecording(false);
      setPaused(false);
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setBlobAndRef(null);
    setElapsedSeconds(0);
    setError("");
  }, [cleanupStream, setBlobAndRef]);

  const start = useCallback(async () => {
    if (!supported) {
      setError("unsupported");
      return;
    }
    setError("");
    setBlobAndRef(null);
    setPaused(false);
    setElapsedSeconds(0);
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
      bindAudioRecorder(
        recorder,
        chunksRef.current,
        waitersRef.current,
        cleanupStream,
        setBlobAndRef,
        setRecording,
        setPaused,
      );
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (caught) {
      cleanupStream();
      setError(classifyMediaError(caught));
    }
  }, [cleanupStream, setBlobAndRef, supported]);

  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;
    recorder.pause();
    if (typeof recorder.requestData === "function") recorder.requestData();
    const next = assembleAudioBlob(chunksRef.current, recorder.mimeType);
    if (next.size > 0) setBlobAndRef(next);
    setPaused(true);
  }, [setBlobAndRef]);

  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "paused") return;
    recorder.resume();
    setPaused(false);
  }, []);

  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      setRecording(false);
      setPaused(false);
      cleanupStream();
    }
  }, [cleanupStream]);

  const stopAndWait = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      const current = blobRef.current;
      return Promise.resolve(current && current.size > 0 ? current : null);
    }
    return new Promise((resolve) => {
      waitersRef.current.push(resolve);
      recorder.stop();
    });
  }, []);

  return {
    supported,
    recording,
    paused,
    blob,
    error,
    elapsedSeconds,
    start,
    pause,
    resume,
    stop,
    stopAndWait,
    reset,
  };
}
