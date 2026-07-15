import { useEffect, useRef } from "react";
import { TASK_CHANGE_EVENT, type TaskChangeDetail } from "../constants/events";

const REFETCH_DEBOUNCE_MS = 300;

/** Refetch handler for pages that display tasks (debounced SSE). */
export function useTaskChangeListener(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (_ev: Event) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), REFETCH_DEBOUNCE_MS);
    };

    window.addEventListener(TASK_CHANGE_EVENT, schedule);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener(TASK_CHANGE_EVENT, schedule);
    };
  }, []);
}

export type { TaskChangeDetail };
