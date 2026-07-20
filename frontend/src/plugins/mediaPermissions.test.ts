import { beforeEach, describe, expect, it, vi } from "vitest";

const { request, isNativePlatform } = vi.hoisted(() => ({
  request: vi.fn(),
  isNativePlatform: vi.fn(),
}));

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => isNativePlatform() },
  registerPlugin: () => ({ request, check: vi.fn() }),
}));

import { ensureNativeAvPermissions } from "./mediaPermissions";

describe("ensureNativeAvPermissions", () => {
  beforeEach(() => {
    request.mockReset();
    isNativePlatform.mockReset();
  });

  it("returns true on web without requesting", async () => {
    isNativePlatform.mockReturnValue(false);
    await expect(ensureNativeAvPermissions({ microphone: true })).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it("returns true when native grants requested permissions", async () => {
    isNativePlatform.mockReturnValue(true);
    request.mockResolvedValue({ camera: "granted", microphone: "granted" });
    await expect(
      ensureNativeAvPermissions({ camera: true, microphone: true })
    ).resolves.toBe(true);
    expect(request).toHaveBeenCalledWith({ camera: true, microphone: true });
  });

  it("returns false when camera denied", async () => {
    isNativePlatform.mockReturnValue(true);
    request.mockResolvedValue({ camera: "denied", microphone: "prompt" });
    await expect(ensureNativeAvPermissions({ camera: true })).resolves.toBe(false);
  });
});
