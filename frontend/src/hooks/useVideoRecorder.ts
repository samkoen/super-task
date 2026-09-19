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
  stopMediaTracks,
  videoRecorderOptions,
  type CameraFacing,
} from "../utils/mediaCapture";
import { startCanvasRecordStream } from "../utils/canvasRecordStream";

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
  const recordingRef = useRef(false);
  const canvasStopRef = useRef<(() => void) | null>(null);
  const micTracksRef = useRef<MediaStreamTrack[]>([]);

  const supported = isMediaCaptureSupported();

  const discardLivePreview = useCallback(() => {
    canvasStopRef.current?.();
    canvasStopRef.current = null;
    for (const track of micTracksRef.current) track.stop();
    micTracksRef.current = [];
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

  const switchLiveVideo = useCallback(async (): Promise<"ready" | "failed" | "cancelled"> => {
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setError("");
    setStarting(true);
    try {
      const nextStream = await getUserMediaWithFallback(
        cameraConstraints(facingRef.current, false),
        { preserveLiveMedia: true },
      );
      if (session !== sessionRef.current) {
        await releaseMediaStream(nextStream);
        return "cancelled";
      }
      const previous = streamRef.current;
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) await attachStreamToVideo(videoRef.current, nextStream);
      stopMediaTracks(previous, "video");
      setPreviewReady(true);
      return "ready";
    } catch (caught) {
      if (session !== sessionRef.current) return "cancelled";
      setError(classifyMediaError(caught));
      return "failed";
    } finally {
      if (session === sessionRef.current) setStarting(false);
    }
  }, []);

  const flip = useCallback(async () => {
    if (recordingRef.current && !canvasStopRef.current) return;
    const previous = facingRef.current;
    facingRef.current = oppositeCameraFacing(previous);
    setFacing(facingRef.current);
    const result = recordingRef.current ? await switchLiveVideo() : await startPreview();
    if (result !== "failed") return;
    facingRef.current = previous;
    setFacing(previous);
    if (!recordingRef.current) await startPreview();
  }, [startPreview, switchLiveVideo]);

  const startRecording = useCallback(() => {
    const currentStream = streamRef.current;
    if (!currentStream || recordingRef.current) return;
    const recordStream = openRecordStream(currentStream, videoRef.current, canvasStopRef, micTracksRef);
    beginMediaRecorder({
      recordStream,
      mediaRecorderRef,
      chunksRef,
      waitersRef,
      startedAtRef,
      tickRef,
      recordingRef,
      setRecording,
      setElapsedSeconds,
      setBlob,
      discardLivePreview,
    });
  }, [discardLivePreview]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        mediaRecorderRef.current = null;
        recordingRef.current = false;
        void discardLivePreview();
      }
      return;
    }
    mediaRecorderRef.current = null;
    recordingRef.current = false;
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
        recordingRef.current = false;
        stopStream();
      }
    } else {
      mediaRecorderRef.current = null;
      recordingRef.current = false;
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

function openRecordStream(
  cameraStream: MediaStream,
  video: HTMLVideoElement | null,
  canvasStopRef: { current: (() => void) | null },
  micTracksRef: { current: MediaStreamTrack[] },
): MediaStream {
  micTracksRef.current = typeof cameraStream.getAudioTracks === "function"
    ? cameraStream.getAudioTracks()
    : [];
  const canvas = video ? startCanvasRecordStream(video, cameraStream) : null;
  canvasStopRef.current = canvas?.stop ?? null;
  return canvas?.stream ?? cameraStream;
}

function beginMediaRecorder(opts: {
  recordStream: MediaStream;
  mediaRecorderRef: { current: MediaRecorder | null };
  chunksRef: { current: Blob[] };
  waitersRef: { current: Array<(blob: Blob | null) => void> };
  startedAtRef: { current: number | null };
  tickRef: { current: number | null };
  recordingRef: { current: boolean };
  setRecording: (value: boolean) => void;
  setElapsedSeconds: (value: number) => void;
  setBlob: (blob: Blob) => void;
  discardLivePreview: () => void;
}) {
  const mimeType = pickVideoRecorderMimeType();
  const recorder = new MediaRecorder(opts.recordStream, videoRecorderOptions(mimeType));
  opts.chunksRef.current = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) opts.chunksRef.current.push(event.data);
  };
  recorder.onstop = () => finishRecorder(recorder, opts);
  opts.mediaRecorderRef.current = recorder;
  recorder.start();
  opts.startedAtRef.current = Date.now();
  opts.setElapsedSeconds(0);
  opts.tickRef.current = window.setInterval(() => {
    if (opts.startedAtRef.current) {
      opts.setElapsedSeconds(Math.max(0, Math.round((Date.now() - opts.startedAtRef.current) / 1000)));
    }
  }, 250);
  opts.recordingRef.current = true;
  opts.setRecording(true);
}

function finishRecorder(
  recorder: MediaRecorder,
  opts: Parameters<typeof beginMediaRecorder>[0],
) {
  clearRecordingClock(opts.tickRef);
  if (opts.startedAtRef.current) {
    opts.setElapsedSeconds(Math.max(1, Math.round((Date.now() - opts.startedAtRef.current) / 1000)));
  }
  recorder.ondataavailable = null;
  recorder.onstop = null;
  opts.mediaRecorderRef.current = null;
  const next = new Blob(opts.chunksRef.current, { type: recorder.mimeType || "video/webm" });
  opts.setBlob(next);
  opts.recordingRef.current = false;
  opts.setRecording(false);
  void opts.discardLivePreview();
  opts.waitersRef.current.splice(0).forEach((resolve) => resolve(next.size > 0 ? next : null));
}

function clearRecordingClock(tickRef: { current: number | null }) {
  if (!tickRef.current) return;
  window.clearInterval(tickRef.current);
  tickRef.current = null;
}
