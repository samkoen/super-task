import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  cameraConstraints,
  classifyMediaError,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  oppositeCameraFacing,
  pickVideoRecorderMimeType,
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

  const supported = isMediaCaptureSupported();

  const detachLivePreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPreviewReady(false);
  }, []);

  const stopStream = useCallback(() => {
    sessionRef.current += 1;
    detachLivePreview();
    setStarting(false);
  }, [detachLivePreview]);

  const reset = useCallback(() => {
    setBlob(null);
    setError("");
    setElapsedSeconds(0);
    startedAtRef.current = null;
  }, []);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
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
    setPreviewReady(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    try {
      const nextStream = await getUserMediaWithFallback(
        cameraConstraints(facingRef.current, true),
      );
      if (session !== sessionRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
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
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setPreviewReady(false);
      setError(classifyMediaError(caught));
      return "failed";
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [supported]);

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
    const recorder = mimeType
      ? new MediaRecorder(currentStream, { mimeType })
      : new MediaRecorder(currentStream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      if (tickRef.current) {
        window.clearInterval(tickRef.current);
        tickRef.current = null;
      }
      if (startedAtRef.current) {
        setElapsedSeconds(Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)));
      }
      const next = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setBlob(next);
      setRecording(false);
      detachLivePreview();
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
  }, [detachLivePreview, recording]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }
    setRecording(false);
  }, []);

  const cleanup = useCallback(() => {
    stopRecording();
    stopStream();
    reset();
  }, [reset, stopRecording, stopStream]);

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
    cleanup,
    reset,
    flip,
  };
}
