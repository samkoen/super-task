import { useEffect, useState } from "react";
import { createMotionMonitor, rotationMagnitude } from "../utils/motionWarning";

type MotionPermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };

/** iOS exige un geste de l'utilisateur : à appeler depuis le toucher qui lance l'enregistrement. */
export async function requestMotionPermission(): Promise<void> {
  const api = (typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : null) as MotionPermissionApi | null;
  if (typeof api?.requestPermission !== "function") return;
  try {
    await api.requestPermission();
  } catch {
    /* sans capteur, l'alerte n'apparaît simplement pas */
  }
}

/** Vrai quand le téléphone tourne trop vite pendant l'enregistrement (gyroscope réel, rien sur ordinateur). */
export function useFastMotion(active: boolean): boolean {
  const [fast, setFast] = useState(false);

  useEffect(() => {
    if (!active) {
      setFast(false);
      return;
    }
    const monitor = createMotionMonitor();
    const onMotion = (event: DeviceMotionEvent) => {
      const show = monitor.push(rotationMagnitude(event.rotationRate), Date.now());
      setFast((previous) => (previous === show ? previous : show));
    };
    const clock = window.setInterval(() => setFast(monitor.push(0, Date.now())), 400);
    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("devicemotion", onMotion);
      window.clearInterval(clock);
      monitor.reset();
      setFast(false);
    };
  }, [active]);

  return fast;
}
