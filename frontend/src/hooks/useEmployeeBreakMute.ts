import { useEffect, useState } from "react";
import { BREAK_CHANGE_EVENT } from "../constants/events";
import { employeeActivityService } from "../services/employeeActivityService";

export function useEmployeeBreakMute(enabled: boolean): boolean {
  const [onBreak, setOnBreak] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOnBreak(false);
      return;
    }
    let cancelled = false;
    employeeActivityService
      .getBreak()
      .then((state) => {
        if (!cancelled) setOnBreak(Boolean(state.on_break));
      })
      .catch(() => {
        if (!cancelled) setOnBreak(false);
      });
    const onChange = (ev: Event) => {
      const detail = (ev as CustomEvent<{ on_break?: boolean }>).detail;
      setOnBreak(Boolean(detail?.on_break));
    };
    window.addEventListener(BREAK_CHANGE_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(BREAK_CHANGE_EVENT, onChange);
    };
  }, [enabled]);

  return enabled && onBreak;
}
