import { useCallback, useEffect, useRef, type RefObject } from "react";
import { lightEnough, meanLuma } from "../utils/lightCheck";

const SIZE = 24;
const EVERY_MS = 500;

function sampleLuma(video: HTMLVideoElement, canvas: HTMLCanvasElement): number | null {
  if (video.readyState < 2 || !video.videoWidth) return null;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(video, 0, 0, SIZE, SIZE);
    return meanLuma(context.getImageData(0, 0, SIZE, SIZE).data);
  } catch {
    return null;
  }
}

/**
 * Mesure la luminosité de la caméra pendant l'enregistrement.
 * `result()` donne le verdict du dernier tournage (`null` si rien n'a pu être mesuré).
 */
export function useLightSampler(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const samples = useRef<number[]>([]);

  useEffect(() => {
    if (!active) return;
    samples.current = [];
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const timer = window.setInterval(() => {
      const video = videoRef.current;
      const value = video ? sampleLuma(video, canvas) : null;
      if (value !== null) samples.current.push(value);
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [active, videoRef]);

  return useCallback(() => lightEnough(samples.current), []);
}
