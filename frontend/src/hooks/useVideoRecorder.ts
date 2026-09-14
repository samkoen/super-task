import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  cameraConstraints,
  classifyMediaError,
  detachCaptureVideo,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  oppositeCameraFacing,
  pickVideoRecorderMimeType,
  releaseMediaStream,
  videoRecorderOptions,
  type CameraFacing,
} from "../utils/mediaCapture";

export function useVideoRecorder(options?: { defaultFacing?: CameraFacing }) {
  const initialFacing = options?.defaultFacing ?? "environment";
  const [recording, setRecording] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const facingRef = useRef<CameraFacing>(initialFacing);
  const waitersRef = useRef<Array<(blob: Blob | null) => void>>([]);
  const releasingRef = useRef(Promise.resolve());

  const supported = isMediaCaptureSupported();

  const discardLivePreview = useCallback(() => {
    const currentStream = streamRef.current;
    const video = videoRef.current;
    streamRef.current = null;
    setStream(null);
    setPreviewReady(false);
    const next = releasingRef.current.then(() => releaseMediaStream(currentStream, video));
    releasingRef.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const stopStream = useCallback(() => {
    sessionRef.current += 1;
    void discardLivePreview();
    setStarting(false);
  }, [discardLivePreview]);

  const reset = useCallback(() => {
    setBlob(null);
    setError("");
    setElapsedSeconds(0);
    startedAtRef.current = null;
  }, []);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
    if (videoRef.current && videoRef.current !== node) {
      detachCaptureVideo(videoRef.current);
    }
    videoRef.current = node;
    const currentStream = streamRef.current;
    if (node && currentStream) {
      void attachStreamToVideo(node, currentStream);
    }
  }, []);

  const startPreview = useCallback(async (): Promise<"ready" | "failed" | "cancelled"> => {
    if (!supported) {
      setError("unsupported");
      return "failed";
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setError("");
    setBlob(null);
    setStarting(true);
    await discardLivePreview();
    if (session !== sessionRef.current) return "cancelled";
    try {
      const nextStream = await getUserMediaWithFallback(
        cameraConstraints(facingRef.current, true),
      );
      if (session !== sessionRef.current) {
        await releaseMediaStream(nextStream);
        return "cancelled";
      }
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, nextStream);
      }
      setPreviewReady(true);
      return "ready";
    } catch (caught) {
      if (session !== sessionRef.current) return "cancelled";
      await discardLivePreview();
      setError(classifyMediaError(caught));
      return "failed";
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [discardLivePreview, supported]);

  const flip = useCallback(async () => {
    if (recording) return;
    const previous = facingRef.current;
    facingRef.current = oppositeCameraFacing(previous);
    setFacing(facingRef.current);
    const result = await startPreview();
    if (result !== "failed") return;
    facingRef.current = previous;
    setFacing(previous);
    await startPreview();
  }, [recording, startPreview]);

  const startRecording = useCallback(() => {
    const currentStream = streamRef.current;
    if (!currentStream || recording) return;
    const mimeType = pickVideoRecorderMimeType();
    const recorder = new MediaRecorder(currentStream, videoRecorderOptions(mimeType));
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      clearRecordingClock(tickRef);
      if (startedAtRef.current) {
        setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
      }
      recorder.ondataavailable = null;
      recorder.onstop = null;
      mediaRecorderRef.current = null;
      const next = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setBlob(next);
      setRecording(false);
      void discardLivePreview();
      waitersRef.current.splice(0).forEach((resolve) => resolve(next.size > 0 ? next : null));
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);
    tickRef.current = window.setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000)));
      }
    }, 250);
    setRecording(true);
  }, [discardLivePreview, recording]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        mediaRecorderRef.current = null;
        void discardLivePreview();
      }
      return;
    }
    mediaRecorderRef.current = null;
    setRecording(false);
  }, [discardLivePreview]);

  const stopAndWait = useCallback((): Promise<Blob | null> => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      waitersRef.current.push(resolve);
      try {
        recorder.stop();
      } catch {
        waitersRef.current.pop();
        resolve(null);
      }
    });
  }, []);

  const cleanup = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        mediaRecorderRef.current = null;
        stopStream();
      }
    } else {
      mediaRecorderRef.current = null;
      stopStream();
    }
    reset();
  }, [reset, stopStream]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    void attachStreamToVideo(videoRef.current, stream);
  }, [stream]);

  useEffect(() => () => cleanup(), [cleanup]);

  return {
    supported,
    previewReady,
    starting,
    recording,
    blob,
    elapsedSeconds,
    error,
    stream,
    facing,
    videoRef,
    onVideoRef,
    startPreview,
    startRecording,
    stopRecording,
    stopAndWait,
    cleanup,
    reset,
    flip,
  };
}

function clearRecordingClock(tickRef: { current: number | null }) {
  if (!tickRef.current) return;
  window.clearInterval(tickRef.current);
  tickRef.current = null;
}
