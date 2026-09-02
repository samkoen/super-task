import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAudioRecorder } from "./useAudioRecorder";

vi.mock("../plugins/mediaPermissions", () => ({
  ensureNativeAvPermissions: vi.fn().mockResolvedValue(true),
}));

class MockMediaRecorder {
  static isTypeSupported = () => true;
  mimeType = "audio/webm";
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  requestData() {
    this.ondataavailable?.({ data: new Blob(["chunk"], { type: "audio/webm" }) });
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

describe("useAudioRecorder", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts then pauses and resumes", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    expect(result.current.recording).toBe(true);
    expect(result.current.paused).toBe(false);

    act(() => {
      result.current.pause();
    });
    expect(result.current.paused).toBe(true);
    expect(result.current.blob).not.toBeNull();

    act(() => {
      result.current.resume();
    });
    expect(result.current.paused).toBe(false);
    expect(result.current.recording).toBe(true);
  });

  it("returns the blob after stopAndWait", async () => {
    const { result } = renderHook(() => useAudioRecorder());
    await act(async () => {
      await result.current.start();
    });
    act(() => {
      result.current.pause();
    });
    let blob: Blob | null = null;
    await act(async () => {
      blob = await result.current.stopAndWait();
    });
    await waitFor(() => {
      expect(blob).not.toBeNull();
    });
  });
});
