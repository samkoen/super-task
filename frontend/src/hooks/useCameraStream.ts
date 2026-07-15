import { useCallback, useEffect, useRef, useState } from "react";
import {
  attachStreamToVideo,
  classifyMediaError,
  getUserMediaWithFallback,
  isMediaCaptureSupported,
  PHOTO_CAMERA_CONSTRAINTS,
} from "../utils/mediaCapture";

export function useCameraStream() {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef(0);

  const supported = isMediaCaptureSupported();

  const stop = useCallback(() => {
    sessionRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
    setStarting(false);
  }, []);

  const onVideoRef = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    const currentStream = streamRef.current;
    if (node && currentStream) {
      void attachStreamToVideo(node, currentStream);
    }
  }, []);

  const start = useCallback(async () => {
    if (!supported) {
      setError("unsupported");
      return;
    }
    const session = sessionRef.current + 1;
    sessionRef.current = session;
    setError("");
    setStarting(true);
    setActive(false);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    try {
      const nextStream = await getUserMediaWithFallback(PHOTO_CAMERA_CONSTRAINTS);
      if (session !== sessionRef.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = nextStream;
      setStream(nextStream);
      if (videoRef.current) {
        await attachStreamToVideo(videoRef.current, nextStream);
      }
      setActive(true);
    } catch (caught) {
      if (session !== sessionRef.current) return;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setActive(false);
      setError(classifyMediaError(caught));
    } finally {
      if (session === sessionRef.current) {
        setStarting(false);
      }
    }
  }, [supported]);

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
    videoRef,
    onVideoRef,
    start,
    stop,
  };
}
