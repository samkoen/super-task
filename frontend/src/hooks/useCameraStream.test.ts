import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useCameraStream } from "./useCameraStream";

vi.mock("../plugins/mediaPermissions", () => ({
  ensureNativeAvPermissions: vi.fn().mockResolvedValue(true),
}));

function facingOf(call: unknown): string | undefined {
  const constraints = call as { video?: { facingMode?: { ideal?: string } } };
  return constraints.video?.facingMode?.ideal;
}

describe("useCameraStream", () => {
  beforeEach(() => {
    vi.stubGlobal("isSecureContext", true);
    vi.stubGlobal(
      "MediaRecorder",
      class {
        static isTypeSupported = () => true;
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the rear camera by default", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.start();
    });

    expect(facingOf(getUserMedia.mock.calls[0][0])).toBe("environment");
    expect(result.current.facing).toBe("environment");
  });

  it("opens the selfie camera when requested", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const { result } = renderHook(() => useCameraStream({ defaultFacing: "user" }));

    await act(async () => {
      await result.current.start();
    });

    expect(facingOf(getUserMedia.mock.calls[0][0])).toBe("user");
    expect(result.current.facing).toBe("user");
  });

  it("flips from rear to selfie on the next stream", async () => {
    const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] });
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      result.current.flip();
    });
    await waitFor(() => {
      expect(result.current.facing).toBe("user");
    });
    expect(facingOf(getUserMedia.mock.calls.at(-1)?.[0])).toBe("user");
  });

  it("restores the previous camera when the other side is unavailable", async () => {
    const rear = { getTracks: () => [{ stop: vi.fn() }] };
    const getUserMedia = vi
      .fn()
      .mockResolvedValueOnce(rear)
      .mockRejectedValueOnce(new Error("no selfie"))
      .mockRejectedValueOnce(new Error("no selfie"))
      .mockResolvedValueOnce(rear);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    const { result } = renderHook(() => useCameraStream());

    await act(async () => {
      await result.current.start();
    });
    await act(async () => {
      await result.current.flip();
    });

    expect(result.current.facing).toBe("environment");
    expect(result.current.active).toBe(true);
  });
});
