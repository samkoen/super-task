import { describe, expect, it, vi } from "vitest";
import { applyTrackTorch, readTrackCaps } from "./cameraTrack";

function fakeTrack(caps: Record<string, unknown>, fails = false) {
  return {
    getCapabilities: () => caps,
    applyConstraints: vi.fn(() => (fails ? Promise.reject(new Error("no")) : Promise.resolve())),
  } as unknown as MediaStreamTrack;
}

describe("cameraTrack", () => {
  it("reads torch support", () => {
    expect(readTrackCaps(fakeTrack({ torch: true }))).toEqual({ torch: true });
  });

  it("reports nothing on a plain webcam", () => {
    expect(readTrackCaps(fakeTrack({}))).toEqual({ torch: false });
    expect(readTrackCaps(null)).toEqual({ torch: false });
  });

  it("applies the torch constraint and reports failures", async () => {
    const ok = fakeTrack({});
    expect(await applyTrackTorch(ok, true)).toBe(true);
    expect(ok.applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
    expect(await applyTrackTorch(fakeTrack({}, true), true)).toBe(false);
  });
});
