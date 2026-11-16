import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { he } from "../../i18n/he";
import FlowVideoPlayer from "./FlowVideoPlayer";

function renderPlayer(onTrim?: (range: { start: number; end: number }) => Promise<unknown>) {
  return render(<FlowVideoPlayer src="blob:x" durationSeconds={38} onTrim={onTrim} />);
}

const startHandle = () => screen.getByTestId("flow-trim-start");
const endHandle = () => screen.getByTestId("flow-trim-end");

describe("FlowVideoPlayer trim button", () => {
  it("is not offered without a trim action", () => {
    renderPlayer();
    expect(screen.queryByTestId("flow-trim-button")).toBeNull();
  });

  it("shows the Figma « חיתוך » button, with the speed toggle still available", () => {
    renderPlayer(vi.fn());
    expect(screen.getByTestId("flow-trim-button").textContent).toBe(he.flowTrim);
    expect(screen.getByTestId("flow-speed-toggle")).toBeTruthy();
  });

  it("opens the selection on the whole video, with apply disabled until something is cut", () => {
    renderPlayer(vi.fn());
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    expect(screen.getByTestId("flow-trim-kept").textContent).toBe(he.flowTrimKept(38));
    expect((screen.getByTestId("flow-trim-apply") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("flow-trim-button")).toBeNull();
  });

  it("cancel closes the selection without cutting", () => {
    const onTrim = vi.fn();
    renderPlayer(onTrim);
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    fireEvent.click(screen.getByTestId("flow-trim-cancel"));
    expect(screen.getByTestId("flow-trim-button")).toBeTruthy();
    expect(onTrim).not.toHaveBeenCalled();
  });
});

describe("FlowVideoPlayer trim selection", () => {
  it("moves the handles with the keyboard and keeps the remaining duration up to date", () => {
    renderPlayer(vi.fn());
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    fireEvent.keyDown(startHandle(), { key: "ArrowLeft" });
    fireEvent.keyDown(startHandle(), { key: "ArrowLeft" });
    fireEvent.keyDown(endHandle(), { key: "ArrowRight" });
    expect(screen.getByTestId("flow-trim-start-time").textContent).toBe("00:02");
    expect(screen.getByTestId("flow-trim-end-time").textContent).toBe("00:37");
    expect(screen.getByTestId("flow-trim-kept").textContent).toBe(he.flowTrimKept(35));
    expect((screen.getByTestId("flow-trim-apply") as HTMLButtonElement).disabled).toBe(false);
  });

  it("never lets the handles cross", () => {
    renderPlayer(vi.fn());
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    for (let i = 0; i < 60; i += 1) fireEvent.keyDown(startHandle(), { key: "ArrowLeft" });
    expect(screen.getByTestId("flow-trim-start-time").textContent).toBe("00:37");
    expect(screen.getByTestId("flow-trim-end-time").textContent).toBe("00:38");
  });
});

describe("FlowVideoPlayer trim apply", () => {
  it("sends the chosen range, waits with a busy state, then closes the selection", async () => {
    let finish: () => void = () => {};
    const onTrim = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    renderPlayer(onTrim);
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    fireEvent.keyDown(startHandle(), { key: "ArrowLeft" });
    fireEvent.click(screen.getByTestId("flow-trim-apply"));
    expect(onTrim).toHaveBeenCalledWith({ start: 1, end: 38 });
    expect(screen.getByTestId("flow-trim-busy")).toBeTruthy();
    expect(screen.queryByTestId("flow-player-play")).toBeNull();
    await act(async () => finish());
    await waitFor(() => expect(screen.queryByTestId("flow-trim-busy")).toBeNull());
    expect(screen.getByTestId("flow-trim-button")).toBeTruthy();
  });

  it("shows an error and keeps the selection when the cut fails", async () => {
    renderPlayer(vi.fn(async () => Promise.reject(new Error("boom"))));
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    fireEvent.keyDown(startHandle(), { key: "ArrowLeft" });
    fireEvent.click(screen.getByTestId("flow-trim-apply"));
    expect((await screen.findByRole("alert")).textContent).toBe(he.flowTrimFailed);
    expect(screen.getByTestId("flow-trim-scrubber")).toBeTruthy();
  });

  it("closes the selection when the video is replaced", () => {
    const { rerender } = renderPlayer(vi.fn());
    fireEvent.click(screen.getByTestId("flow-trim-button"));
    rerender(<FlowVideoPlayer src="blob:y" durationSeconds={20} onTrim={vi.fn()} />);
    expect(screen.queryByTestId("flow-trim-scrubber")).toBeNull();
    expect(screen.getByTestId("flow-trim-button")).toBeTruthy();
  });
});
