import { describe, expect, it } from "vitest";
import { formatAudioElapsed } from "./formatAudioElapsed";

describe("formatAudioElapsed", () => {
  it("formats minutes and seconds", () => {
    expect(formatAudioElapsed(0)).toBe("0:00");
    expect(formatAudioElapsed(5)).toBe("0:05");
    expect(formatAudioElapsed(65)).toBe("1:05");
  });

  it("ignores negative values", () => {
    expect(formatAudioElapsed(-3)).toBe("0:00");
  });
});
