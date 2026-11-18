import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import FlowVideoCamera from "./FlowVideoCamera";

function makeRecorder(recording: boolean) {
  return {
    supported: true,
    previewReady: true,
    starting: false,
    recording,
    blob: null,
    elapsedSeconds: recording ? 24 : 0,
    error: null,
    stream: null,
    facing: "environment",
    videoRef: { current: null },
    onVideoRef: vi.fn(),
    startPreview: vi.fn(),
    startRecording: vi.fn(),
    stopRecording: vi.fn(),
    stopAndWait: vi.fn(),
    cleanup: vi.fn(),
    reset: vi.fn(),
    flip: vi.fn(),
  } as unknown as Parameters<typeof FlowVideoCamera>[0]["recorder"];
}

function renderCamera(recording: boolean, onChat?: () => void) {
  render(
    <FlowVideoCamera
      recorder={makeRecorder(recording)}
      guide={{ title: "סרטון גיבוי", progress: { done: 0, total: 3 }, ...(onChat ? { onChat } : {}) }}
      minSeconds={10}
      handingOver={false}
      onClose={vi.fn()}
    />,
  );
}

describe("FlowVideoCamera", () => {
  it.each([false, true])("never shows a 0.5× / 1× selector in the camera (recording=%s)", (recording) => {
    renderCamera(recording);
    expect(screen.queryByTestId("flow-speed-toggle")).toBeNull();
    expect(screen.queryByTestId("flow-zoom-toggle")).toBeNull();
    expect(screen.getByTestId("flow-record-button").getAttribute("data-recording")).toBe(String(recording));
  });

  it("shows the sub-task chat icon next to back (screen 06)", () => {
    const onChat = vi.fn();
    renderCamera(false, onChat);
    fireEvent.click(screen.getByTestId("flow-page-chat"));
    expect(onChat).toHaveBeenCalledTimes(1);
  });

  it("has no chat icon when the screen gives no chat", () => {
    renderCamera(false);
    expect(screen.queryByTestId("flow-page-chat")).toBeNull();
  });

  it("disables the chat icon while recording", () => {
    renderCamera(true, vi.fn());
    expect((screen.getByTestId("flow-page-chat") as HTMLButtonElement).disabled).toBe(true);
  });
});
