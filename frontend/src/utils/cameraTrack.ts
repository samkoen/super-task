/** Flash réel d'une piste caméra, quand l'appareil le propose. */

export type TrackCaps = { torch: boolean };

type ExtendedCaps = MediaTrackCapabilities & { torch?: boolean };
type ExtendedConstraint = MediaTrackConstraintSet & { torch?: boolean };

export function readTrackCaps(track: MediaStreamTrack | null | undefined): TrackCaps {
  const caps = (track && typeof track.getCapabilities === "function" ? track.getCapabilities() : {}) as ExtendedCaps;
  return { torch: Boolean(caps.torch) };
}

export async function applyTrackTorch(track: MediaStreamTrack, on: boolean): Promise<boolean> {
  try {
    await track.applyConstraints({ advanced: [{ torch: on } as ExtendedConstraint] });
    return true;
  } catch {
    return false;
  }
}
