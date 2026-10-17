import { useEffect, useState } from "react";

/** Date courante rafraîchie à intervalle régulier (horloge d'écran). */
export function useNowClock(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
