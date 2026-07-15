import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  classifyMediaError,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  pickVideoRecorderMimeType,
  VIDEO_CAMERA_CONSTRAINTS,
} from "../utils/mediaCapture";

export function useVideoRecorder() {
  const [recording, setRecording] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const sessionRef = useRef(0);

  const supported = isMediaCaptureSupported();

  const stopStream = useCallback(() => {
    sessionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setPreviewReady(false);
    setStarting(false);
  }, []);

  const reset = useCallback(() => {
    setBlob(null);
    setError("");
  }, []);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    const currentStream = streamRef.current;
    if (node && currentStream) {
      void attachStreamToVideo(node, currentStream);
    }
  }, []);

  const startPreview = useCallback(async () => {
    if (!supported) {
      setError("unsupported");
      return;
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
      const nextStream = await getUserMediaWithFallback(VIDEO_CAMERA_CONSTRAINTS);
      if (session !== sessionRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, nextStream);
      }
      setPreviewReady(true);
    } catch (caught) {
      if (session !== sessionRef.current) return;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setPreviewReady(false);
      setError(classifyMediaError(caught));
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [supported]);

  const startRecording = useCallback(() => {
    const currentStream = streamRef.current;
    if (!currentStream || recording) return;
    const mimeType = pickVideoRecorderMimeType();
    const recorder = mimeType ? new MediaRecorder(currentStream, { mimeType }) : new MediaRecorder(currentStream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const next = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      setBlob(next);
      setRecording(false);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
  }, [recording]);

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
    error,
    stream,
    videoRef,
    onVideoRef,
    startPreview,
    startRecording,
    stopRecording,
    cleanup,
    reset,
  };
}
