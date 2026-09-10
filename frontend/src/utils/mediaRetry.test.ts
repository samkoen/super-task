import { describe, expect, it } from "vitest";
import {
  isRetryableMediaError,
  isRetryableMediaStatus,
  nextMediaRetryDelayMs,
} from "./mediaRetry";

describe("mediaRetry", () => {
  it("returns backoff delays then stops", () => {
    expect(nextMediaRetryDelayMs(0)).toBe(300);
    expect(nextMediaRetryDelayMs(1)).toBe(1000);
    expect(nextMediaRetryDelayMs(2)).toBe(3000);
    expect(nextMediaRetryDelayMs(3)).toBe(5000);
    expect(nextMediaRetryDelayMs(4)).toBe(8000);
    expect(nextMediaRetryDelayMs(5)).toBeNull();
  });

  it("retries transient proxy failures but not client auth errors", () => {
    expect(isRetryableMediaStatus(403)).toBe(true);
    expect(isRetryableMediaStatus(404)).toBe(true);
    expect(isRetryableMediaStatus(503)).toBe(true);
    expect(isRetryableMediaStatus(401)).toBe(false);
    expect(isRetryableMediaStatus(400)).toBe(false);
  });

  it("treats network errors as retryable and 401 as final", () => {
    expect(isRetryableMediaError(new Error("Failed to fetch"))).toBe(true);
    expect(isRetryableMediaError(new Error("media fetch failed: 404"))).toBe(true);
    expect(isRetryableMediaError(new Error("media fetch failed: 401"))).toBe(false);
  });
});
