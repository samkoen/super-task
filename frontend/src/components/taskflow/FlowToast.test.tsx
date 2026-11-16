import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import FlowToast from "./FlowToast";
import { he } from "../../i18n/he";

afterEach(() => vi.useRealTimers());

describe("FlowToast", () => {
  it("shows kept with the remaining count", () => {
    render(<FlowToast toast={{ kind: "kept", remaining: 2 }} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-toast-title").textContent).toBe(he.flowToastKept);
    expect(screen.getByTestId("flow-toast-subtitle").textContent).toBe(he.flowToastRemaining(2));
  });

  it("says everything is ready to send after the last card", () => {
    render(<FlowToast toast={{ kind: "kept", remaining: 0 }} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-toast-subtitle").textContent).toBe(he.flowToastAllReady);
  });

  it("shows an error tone when sending failed", () => {
    render(<FlowToast toast={{ kind: "failed", remaining: 0 }} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-toast").getAttribute("data-tone")).toBe("error");
    expect(screen.getByTestId("flow-toast-title").textContent).toBe(he.flowToastFailed);
  });

  it("closes itself after the delay", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<FlowToast toast={{ kind: "kept", remaining: 0 }} onClose={onClose} durationMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing without toast", () => {
    render(<FlowToast toast={null} onClose={vi.fn()} />);
    expect(screen.queryByTestId("flow-toast")).toBeNull();
  });
});
