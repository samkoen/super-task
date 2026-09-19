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
        state = "inactive";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        constructor(_stream: MediaStream) {}
        start() {
          this.state = "recording";
          this.ondataavailable?.({ data: new Blob(["video"], { type: "video/webm" }) });
        }
        stop() {
          this.state = "inactive";
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

  it("opens the camera again after a recording is stopped", async () => {
    const firstStop = vi.fn();
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce({ getTracks: () => [{ stop: firstStop }] })
      .mockResolvedValueOnce({ getTracks: () => [{ stop: vi.fn() }] });
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
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
    expect(firstStop).toHaveBeenCalled();

    await act(async () => {
      await result.current.startPreview();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(result.current.previewReady).toBe(true);
  });

  it("pauses the live video before stopping camera tracks", async () => {
    const video = document.createElement("video");
    Object.defineProperty(video, "readyState", { value: HTMLMediaElement.HAVE_CURRENT_DATA });
    vi.spyOn(video, "play").mockResolvedValue();
    vi.spyOn(video, "load").mockImplementation(() => undefined);
    const order: string[] = [];
    vi.spyOn(video, "pause").mockImplementation(() => {
      order.push("pause");
    });
    const trackStop = vi.fn(() => {
      expect(video.srcObject).toBeNull();
      order.push("stop");
    });
    const stream = {
      getTracks: () => [{ stop: trackStop }],
      removeTrack: vi.fn(),
    } as unknown as MediaStream;
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const { result } = renderHook(() => useVideoRecorder());
    act(() => {
      result.current.onVideoRef(video);
    });
    await act(async () => {
      await result.current.startPreview();
    });
    act(() => {
      result.current.startRecording();
    });
    await act(async () => {
      result.current.stopRecording();
    });
    await waitFor(() => {
      expect(trackStop).toHaveBeenCalled();
    });
    expect(order[0]).toBe("pause");
    expect(order.indexOf("pause")).toBeLessThan(order.indexOf("stop"));
  });

  it("flips the live preview to the selfie camera", async () => {
    const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia },
    });

    const { result } = renderHook(() => useVideoRecorder());

    await act(async () => {
      await result.current.startPreview();
    });
    await act(async () => {
      result.current.flip();
    });
    await waitFor(() => {
      expect(result.current.facing).toBe("user");
    });
    const last = getUserMedia.mock.calls.at(-1)?.[0] as { video?: { facingMode?: { ideal?: string } } };
    expect(last.video?.facingMode?.ideal).toBe("user");
  });

  it("switches to the selfie camera while recording", async () => {
    const videoEl = document.createElement("video");
    Object.defineProperty(videoEl, "videoWidth", { value: 64 });
    Object.defineProperty(videoEl, "videoHeight", { value: 48 });
    Object.defineProperty(videoEl, "readyState", { value: HTMLMediaElement.HAVE_CURRENT_DATA });
    vi.spyOn(videoEl, "play").mockResolvedValue();
    vi.spyOn(videoEl, "pause").mockImplementation(() => undefined);
    vi.spyOn(videoEl, "load").mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      { drawImage: vi.fn() } as unknown as CanvasRenderingContext2D,
    );
    const added: MediaStreamTrack[] = [];
    HTMLCanvasElement.prototype.captureStream = function () {
      return {
        addTrack: (track: MediaStreamTrack) => added.push(track),
        getTracks: () => added,
        getAudioTracks: () => added.filter((t) => t.kind === "audio"),
      } as unknown as MediaStream;
    };
    const backVideoStop = vi.fn();
    const micStop = vi.fn();
    const mic = { kind: "audio", stop: micStop } as unknown as MediaStreamTrack;
    const back = {
      getTracks: () => [{ kind: "video", stop: backVideoStop }, mic],
      getAudioTracks: () => [mic],
      removeTrack: vi.fn(),
    };
    const front = {
      getTracks: () => [{ kind: "video", stop: vi.fn() }],
      getAudioTracks: () => [],
      removeTrack: vi.fn(),
    };
    const getUserMedia = vi.fn().mockResolvedValueOnce(back).mockResolvedValueOnce(front);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });

    const { result } = renderHook(() => useVideoRecorder());
    act(() => result.current.onVideoRef(videoEl));
    await act(async () => {
      await result.current.startPreview();
    });
    act(() => {
      result.current.startRecording();
    });
    expect(result.current.recording).toBe(true);
    await act(async () => {
      await result.current.flip();
    });
    expect(result.current.recording).toBe(true);
    expect(result.current.facing).toBe("user");
    expect(result.current.blob).toBeNull();
    expect(backVideoStop).toHaveBeenCalled();
    expect(micStop).not.toHaveBeenCalled();
  });
});
