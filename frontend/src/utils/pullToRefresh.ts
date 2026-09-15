export const PULL_REFRESH_THRESHOLD_PX = 64;

const FIELD_SELECTOR = "input, textarea, select, [contenteditable='true']";

export function isPullFromField(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(FIELD_SELECTOR));
}

export function ancestorBlocksPull(target: EventTarget | null): boolean {
  if (window.scrollY > 1) return true;
  let node: Element | null = target instanceof Element ? target : null;
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.scrollTop > 1) return true;
    node = node.parentElement;
  }
  return document.documentElement.scrollTop > 1;
}

export function pullDeltaFromTouch(
  startY: number,
  currentY: number,
  blocked: boolean,
): number {
  if (blocked) return 0;
  return Math.max(0, currentY - startY);
}

export function shouldReleasePullRefresh(delta: number): boolean {
  return delta >= PULL_REFRESH_THRESHOLD_PX;
}

export function pullIndicatorOffset(delta: number, refreshing: boolean): number {
  if (refreshing) return 48;
  return Math.min(80, delta * 0.45);
}

export type PullRefreshBindCtx = {
  getRefreshing: () => boolean;
  setDelta: (delta: number) => void;
  onRelease: () => void;
};

export function bindPullToRefresh(el: HTMLElement, ctx: PullRefreshBindCtx): () => void {
  const gesture = { tracking: false, startY: 0, delta: 0 };
  return listenPullGestures(el, {
    onStart: (event) => startPullGesture(event, ctx, gesture),
    onMove: (event) => movePullGesture(event, ctx, gesture),
    onEnd: () => endPullGesture(ctx, gesture),
  });
}

type PullGesture = { tracking: boolean; startY: number; delta: number };

function startPullGesture(event: TouchEvent, ctx: PullRefreshBindCtx, gesture: PullGesture) {
  if (ctx.getRefreshing() || isPullFromField(event.target) || ancestorBlocksPull(event.target)) {
    gesture.tracking = false;
    return;
  }
  gesture.tracking = true;
  gesture.startY = event.touches[0]?.clientY ?? 0;
  gesture.delta = 0;
}

function movePullGesture(event: TouchEvent, ctx: PullRefreshBindCtx, gesture: PullGesture) {
  if (!gesture.tracking || ctx.getRefreshing()) return;
  const y = event.touches[0]?.clientY ?? gesture.startY;
  gesture.delta = pullDeltaFromTouch(gesture.startY, y, ancestorBlocksPull(event.target));
  ctx.setDelta(gesture.delta);
  if (gesture.delta > 0) event.preventDefault();
}

function endPullGesture(ctx: PullRefreshBindCtx, gesture: PullGesture) {
  if (gesture.tracking && shouldReleasePullRefresh(gesture.delta) && !ctx.getRefreshing()) {
    ctx.onRelease();
  } else {
    ctx.setDelta(0);
  }
  gesture.tracking = false;
  gesture.startY = 0;
  gesture.delta = 0;
}

function listenPullGestures(
  el: HTMLElement,
  handlers: {
    onStart: (event: TouchEvent) => void;
    onMove: (event: TouchEvent) => void;
    onEnd: () => void;
  },
): () => void {
  el.addEventListener("touchstart", handlers.onStart, { passive: true });
  el.addEventListener("touchmove", handlers.onMove, { passive: false });
  el.addEventListener("touchend", handlers.onEnd);
  el.addEventListener("touchcancel", handlers.onEnd);
  return () => {
    el.removeEventListener("touchstart", handlers.onStart);
    el.removeEventListener("touchmove", handlers.onMove);
    el.removeEventListener("touchend", handlers.onEnd);
    el.removeEventListener("touchcancel", handlers.onEnd);
  };
}
