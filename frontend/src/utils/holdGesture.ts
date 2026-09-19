export const HOLD_MS = 450;

export function createHoldGesture(handlers: {
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let holding = false;
  let active = false;
  let handled = false;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const finishHold = () => {
    holding = false;
    handled = true;
    handlers.onHoldEnd();
  };

  const tap = () => {
    handled = true;
    handlers.onTap();
  };

  return {
    onPointerDown() {
      if (active) return;
      active = true;
      holding = false;
      handled = false;
      timer = setTimeout(() => {
        holding = true;
        handlers.onHoldStart();
      }, HOLD_MS);
    },
    onPointerUp() {
      if (!active) return;
      active = false;
      clearTimer();
      if (holding) {
        finishHold();
        return;
      }
      tap();
    },
    onPointerCancel() {
      if (!active) return;
      active = false;
      clearTimer();
      if (holding) {
        finishHold();
        return;
      }
      tap();
    },
    onClick() {
      if (handled || holding) return;
      tap();
    },
  };
}
