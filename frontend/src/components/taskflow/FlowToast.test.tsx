import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import FlowToast from "./FlowToast";
import { he } from "../../i18n/he";

afterEach(() => vi.useRealTimers());

describe("FlowToast", () => {
  it("shows sent with the remaining count", () => {
    render(<FlowToast toast={{ kind: "sent", remaining: 2 }} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-toast-title").textContent).toBe(he.flowToastSent);
    expect(screen.getByTestId("flow-toast-subtitle").textContent).toBe(he.flowToastRemaining(2));
  });

  it("shows the saved-on-device toast when offline", () => {
    render(<FlowToast toast={{ kind: "saved", remaining: 1 }} onClose={vi.fn()} />);
    expect(screen.getByTestId("flow-toast").getAttribute("data-tone")).toBe("pending");
    expect(screen.getByTestId("flow-toast-title").textContent).toBe(he.flowToastSavedOnDevice);
  });

  it("closes itself after the delay", () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<FlowToast toast={{ kind: "sent", remaining: 0 }} onClose={onClose} durationMs={1000} />);
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
