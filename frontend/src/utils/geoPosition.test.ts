import { describe, expect, it, vi } from "vitest";
import { getCurrentLocation } from "./geoPosition";

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

describe("getCurrentLocation", () => {
  it("resolves with the device position", async () => {
    const geo = {
      getCurrentPosition: (ok: Success) =>
        ok({ coords: { latitude: 31.7, longitude: 35.2, accuracy: 12 } } as GeolocationPosition),
    };
    await expect(getCurrentLocation(geo)).resolves.toEqual({ lat: 31.7, lng: 35.2, accuracy: 12 });
  });

  it("resolves null when permission is denied", async () => {
    const geo = { getCurrentPosition: (_ok: Success, fail: Failure) => fail({ code: 1 } as GeolocationPositionError) };
    await expect(getCurrentLocation(geo)).resolves.toBeNull();
  });

  it("resolves null without a geolocation API or when it throws", async () => {
    await expect(getCurrentLocation(undefined)).resolves.toBeNull();
    const geo = {
      getCurrentPosition: () => {
        throw new Error("boom");
      },
    };
    await expect(getCurrentLocation(geo)).resolves.toBeNull();
  });

  it("gives up when the sensor never answers", async () => {
    vi.useFakeTimers();
    const pending = getCurrentLocation({ getCurrentPosition: () => undefined }, 1000);
    await vi.advanceTimersByTimeAsync(1600);
    await expect(pending).resolves.toBeNull();
    vi.useRealTimers();
  });
});
