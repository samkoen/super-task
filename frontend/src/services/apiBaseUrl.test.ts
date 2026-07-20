import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./apiBaseUrl";

describe("resolveApiBaseUrl", () => {
  it("uses VITE_API_URL when set", () => {
    expect(resolveApiBaseUrl("http://192.168.1.10:5001/api/", { isNative: true })).toBe(
      "http://192.168.1.10:5001/api"
    );
  });

  it("uses /api in the browser", () => {
    expect(resolveApiBaseUrl(null, { isNative: false, origin: "http://localhost:5173" })).toBe(
      "/api"
    );
  });

  it("uses /api for Capacitor live-reload on LAN Vite", () => {
    expect(
      resolveApiBaseUrl(null, {
        isNative: true,
        origin: "http://192.168.150.166:5173",
      })
    ).toBe("/api");
  });

  it("uses emulator loopback for bundled Capacitor app", () => {
    expect(resolveApiBaseUrl(null, { isNative: true, origin: "https://localhost" })).toBe(
      "http://10.0.2.2:5001/api"
    );
  });
});
