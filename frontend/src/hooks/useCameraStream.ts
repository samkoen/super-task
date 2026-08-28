import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  cameraConstraints,
  classifyMediaError,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  oppositeCameraFacing,
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

  const supported = isMediaCaptureSupported();

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stop = useCallback(() => {
    sessionRef.current += 1;
    releaseStream();
    setActive(false);
    setStarting(false);
  }, [releaseStream]);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
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
    releaseStream();
    try {
      const nextStream = await getUserMediaWithFallback(
        cameraConstraints(facingRef.current, false),
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
      setActive(true);
      return "ready";
    } catch (caught) {
      if (session !== sessionRef.current) return "cancelled";
      releaseStream();
      setActive(false);
      setError(classifyMediaError(caught));
      return "failed";
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [releaseStream, supported]);

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
