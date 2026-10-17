import { describe, expect, it } from "vitest";
import {
  API_TIMEOUT_LOCAL_DEV_MS,
  API_TIMEOUT_MS,
  resolveApiBaseUrl,
  resolveApiTimeoutMs,
} from "./apiBaseUrl";

describe("resolveApiTimeoutMs", () => {
  it("leaves a long timeout on localhost, where the API talks to a remote database", () => {
    expect(resolveApiTimeoutMs({ isNative: false, origin: "http://localhost:5173" })).toBe(
      API_TIMEOUT_LOCAL_DEV_MS,
    );
  });

  it("keeps the standard timeout on the deployed site and in the APK", () => {
    expect(resolveApiTimeoutMs({ isNative: false, origin: "https://super.onrender.com" })).toBe(API_TIMEOUT_MS);
    expect(resolveApiTimeoutMs({ isNative: true, origin: "https://localhost" })).toBe(API_TIMEOUT_MS);
  });
});

describe("resolveApiBaseUrl", () => {
  it("forces /api on localhost even if VITE_API_URL points to Render", () => {
    expect(
      resolveApiBaseUrl("https://super-api-eh64.onrender.com/api", {
        isNative: false,
        origin: "http://localhost:5173",
      })
    ).toBe("/api");
  });

  it("uses VITE_API_URL on native APK (bundled)", () => {
    expect(
      resolveApiBaseUrl("https://super-api-eh64.onrender.com/api", {
        isNative: true,
        origin: "https://localhost",
      })
    ).toBe("https://super-api-eh64.onrender.com/api");
  });

  it("uses /api in the browser when env is unset", () => {
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

  it("uses emulator loopback for bundled Capacitor without env", () => {
    expect(resolveApiBaseUrl(null, { isNative: true, origin: "https://localhost" })).toBe(
      "http://10.0.2.2:5001/api"
    );
  });
});
