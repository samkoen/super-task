import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  cameraConstraints,
  classifyMediaError,
  detachCaptureVideo,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  oppositeCameraFacing,
  releaseMediaStream,
  type CameraFacing,
} from "../utils/mediaCapture";

export type { CameraFacing };

type UseCameraStreamOptions = {
  defaultFacing?: CameraFacing;
};

export function useCameraStream(options?: UseCameraStreamOptions) {
  const initialFacing = options?.defaultFacing ?? "environment";
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facing, setFacing] = useState<CameraFacing>(initialFacing);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);
  const facingRef = useRef<CameraFacing>(initialFacing);
  const releasingRef = useRef(Promise.resolve());

  const supported = isMediaCaptureSupported();

  const discardStream = useCallback(() => {
    const currentStream = streamRef.current;
    const video = videoRef.current;
    streamRef.current = null;
    setStream(null);
    const next = releasingRef.current.then(() => releaseMediaStream(currentStream, video));
    releasingRef.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    void discardStream();
    setActive(false);
    setStarting(false);
  }, [discardStream]);

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

  const start = useCallback(async (): Promise<"ready" | "failed" | "cancelled"> => {
    if (!supported) {
      setError("unsupported");
      return "failed";
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setError("");
    setStarting(true);
    setActive(false);
    await discardStream();
    if (session !== sessionRef.current) return "cancelled";
    try {
      const nextStream = await getUserMediaWithFallback(
        cameraConstraints(facingRef.current, false),
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
      setActive(true);
      return "ready";
    } catch (caught) {
      if (session !== sessionRef.current) return "cancelled";
      await discardStream();
      setActive(false);
      setError(classifyMediaError(caught));
      return "failed";
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [discardStream, supported]);

  const flip = useCallback(async () => {
    const previous = facingRef.current;
    facingRef.current = oppositeCameraFacing(previous);
    setFacing(facingRef.current);
    const result = await start();
    if (result !== "failed") return;
    facingRef.current = previous;
    setFacing(previous);
    await start();
  }, [start]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    void attachStreamToVideo(videoRef.current, stream);
  }, [stream]);

  useEffect(() => () => stop(), [stop]);

  return {
    supported,
    active,
    starting,
    error,
    stream,
    facing,
    videoRef,
    onVideoRef,
    start,
    stop,
    flip,
  };
}
