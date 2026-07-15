import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useVideoRecorder } from "./useVideoRecorder";

describe("useVideoRecorder", () => {
  beforeEach(() => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal(
      "MediaRecorder",
      class MockMediaRecorder {
        static isTypeSupported = () => true;
        mimeType = "video/webm";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        constructor(_stream: MediaStream) {}
        start() {
          this.ondataavailable?.({ data: new Blob(["video"], { type: "video/webm" }) });
        }
        stop() {
          this.onstop?.();
        }
      }
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("stores the recording and stops the live camera stream", async () => {
    const trackStop = vi.fn();
    const stream = { getTracks: () => [{ stop: trackStop }] } as unknown as MediaStream;
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(stream),
      },
    });

    const { result } = renderHook(() => useVideoRecorder());

    await act(async () => {
      await result.current.startPreview();
    });

    act(() => {
      result.current.startRecording();
    });

    act(() => {
      result.current.stopRecording();
    });

    await waitFor(() => {
      expect(result.current.blob).not.toBeNull();
    });

    expect(trackStop).toHaveBeenCalled();
    expect(result.current.stream).toBeNull();
    expect(result.current.previewReady).toBe(false);
  });
});
