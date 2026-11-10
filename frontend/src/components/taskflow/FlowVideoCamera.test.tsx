import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

function renderCamera(recording: boolean) {
  render(
    <FlowVideoCamera
      recorder={makeRecorder(recording)}
      guide={{ title: "סרטון גיבוי", progress: { done: 0, total: 3 } }}
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
});
