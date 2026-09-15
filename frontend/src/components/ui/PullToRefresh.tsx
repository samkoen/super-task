import { useRef, type ReactNode } from "react";
import { Box, CircularProgress } from "@mui/material";
import { dispatchManualLiveRefresh } from "../../constants/events";
import { usePullToRefresh } from "../../hooks/usePullToRefresh";
import { he } from "../../i18n/he";
import { pullIndicatorOffset, shouldReleasePullRefresh } from "../../utils/pullToRefresh";

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => void | Promise<void>;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { delta, refreshing } = usePullToRefresh(onRefresh, rootRef);
  const offset = pullIndicatorOffset(delta, refreshing);
  const visible = offset > 8;
  const label = pullRefreshLabel(delta, refreshing);

  return (
    <Box ref={rootRef} data-testid="pull-to-refresh" sx={{ position: "relative", touchAction: "pan-y" }}>
      <Box
        aria-hidden={!visible}
        aria-live="polite"
        role="status"
        sx={pullIndicatorSx(offset, visible)}
      >
        <CircularProgress size={22} aria-label={label} />
      </Box>
      <Box sx={{ pt: visible ? `${offset}px` : 0 }}>{children}</Box>
    </Box>
  );
}

export function LivePullToRefresh({ children }: { children: ReactNode }) {
  return <PullToRefresh onRefresh={dispatchManualLiveRefresh}>{children}</PullToRefresh>;
}

export function pullRefreshLabel(delta: number, refreshing: boolean): string {
  if (refreshing) return he.loading;
  if (shouldReleasePullRefresh(delta)) return he.pullToRefreshRelease;
  return he.pullToRefreshHint;
}

function pullIndicatorSx(offset: number, visible: boolean) {
  return {
    position: "absolute" as const,
    top: 8,
    left: 0,
    right: 0,
    zIndex: 2,
    display: "flex",
    justifyContent: "center",
    opacity: visible ? 1 : 0,
    transform: `translateY(${Math.max(0, offset - 24)}px)`,
    pointerEvents: "none" as const,
  };
}
