export const HOLD_MS = 450;

export function createHoldGesture(handlers: {
  onTap: () => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let holding = false;
  let active = false;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  return {
    onPointerDown(event: { pointerId: number; currentTarget: { setPointerCapture?: (id: number) => void } }) {
      if (active) return;
      active = true;
      holding = false;
      event.currentTarget.setPointerCapture?.(event.pointerId);
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
        holding = false;
        handlers.onHoldEnd();
        return;
      }
      handlers.onTap();
    },
    onPointerCancel() {
      if (!active) return;
      active = false;
      clearTimer();
      if (holding) {
        holding = false;
        handlers.onHoldEnd();
      }
    },
  };
}
