import { useEffect, useRef, useState, type RefObject } from "react";
import { bindPullToRefresh } from "../utils/pullToRefresh";

export function usePullToRefresh(
  onRefresh: () => void | Promise<void>,
  rootRef: RefObject<HTMLElement | null>,
) {
  const [delta, setDelta] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  refreshingRef.current = refreshing;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    return bindPullToRefresh(el, {
      getRefreshing: () => refreshingRef.current,
      setDelta,
      onRelease: () => {
        void runPullRefresh(onRefreshRef.current, setRefreshing, setDelta);
      },
    });
  }, [rootRef]);

  return { delta, refreshing };
}

export async function runPullRefresh(
  onRefresh: () => void | Promise<void>,
  setRefreshing: (value: boolean) => void,
  setDelta: (value: number) => void,
): Promise<void> {
  setRefreshing(true);
  try {
    await onRefresh();
  } finally {
    setRefreshing(false);
    setDelta(0);
  }
}
