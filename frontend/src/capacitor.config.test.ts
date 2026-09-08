import { describe, expect, it } from "vitest";
import config from "../capacitor.config";

describe("capacitor.config", () => {
  it("serves the bundled APK on https://localhost so session cookies work", () => {
    expect(config.server?.androidScheme).toBe("https");
    expect(config.server?.hostname).toBe("localhost");
    expect(config.plugins?.CapacitorCookies).toEqual({ enabled: true });
    expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true });
  });

  it("does not load the remote site in the WebView (ANR)", () => {
    expect(config.webDir).toBe("dist");
    expect(config.server && "url" in config.server ? config.server.url : undefined).toBeUndefined();
  });

  it("allows mixed content for the Vercel API from the WebView", () => {
    expect(config.android?.allowMixedContent).toBe(true);
  });
});
