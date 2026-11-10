import { useCallback, useEffect, useState } from "react";
import { applyTrackTorch, readTrackCaps } from "../utils/cameraTrack";

/** Flash de la caméra en cours ; il n'est proposé que si l'appareil sait l'allumer. */
export function useCameraTools(stream: MediaStream | null) {
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    const track = stream?.getVideoTracks?.()[0] ?? null;
    setTorchAvailable(readTrackCaps(track).torch);
    setTorchOn(false);
  }, [stream]);

  const toggleTorch = useCallback(async () => {
    const track = stream?.getVideoTracks?.()[0];
    if (!track || !torchAvailable) return;
    if (await applyTrackTorch(track, !torchOn)) setTorchOn(!torchOn);
  }, [stream, torchAvailable, torchOn]);

  return { torchAvailable, torchOn, toggleTorch };
}
