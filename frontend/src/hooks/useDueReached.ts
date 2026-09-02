import { useEffect, useState } from "react";
import { isPunchDue } from "../utils/punchDoor";

export function useDueReached(dueAt: string | null | undefined): boolean {
  const [reached, setReached] = useState(() => isPunchDue(dueAt, new Date()));
  useEffect(() => {
    if (!dueAt) {
      setReached(false);
      return;
    }
    const ms = new Date(dueAt).getTime();
    if (!Number.isFinite(ms)) {
      setReached(false);
      return;
    }
    const remaining = ms - Date.now();
    if (remaining <= 0) {
      setReached(true);
      return;
    }
    setReached(false);
    const delay = Math.min(remaining, 2_147_483_647);
    const id = window.setTimeout(() => setReached(true), delay);
    return () => window.clearTimeout(id);
  }, [dueAt]);
  return reached;
}
