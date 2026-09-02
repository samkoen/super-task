import { useEffect, useState } from "react";
import { captureVideoPoster } from "../utils/videoPoster";

export function useVideoPoster(src: string | null): string | null {
  const [poster, setPoster] = useState<string | null>(null);
  useEffect(() => {
    if (!src) {
      setPoster(null);
      return;
    }
    setPoster(null);
    let cancelled = false;
    void captureVideoPoster(src).then((url) => {
      if (!cancelled) setPoster(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);
  return poster;
}
