import { useEffect } from "react";
import { TASK_CHANGE_EVENT } from "../constants/events";

/** Refetch handler for pages that display tasks. */
export function useTaskChangeListener(onChange: () => void) {
  useEffect(() => {
    window.addEventListener(TASK_CHANGE_EVENT, onChange);
    return () => window.removeEventListener(TASK_CHANGE_EVENT, onChange);
  }, [onChange]);
}
