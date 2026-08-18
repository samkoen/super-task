import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { displayedAudioTranscript } from "./displayedAudioTranscript";

describe("displayedAudioTranscript", () => {
  it("keeps a real transcript", () => {
    expect(
      displayedAudioTranscript("  ניקוי המדף  ", { hasAudio: true }),
    ).toBe("ניקוי המדף");
  });

  it("shows fallback when audio exists without transcript", () => {
    expect(displayedAudioTranscript("", { hasAudio: true })).toBe(
      he.audioTranscriptionFailed,
    );
  });

  it("does not fallback for pending capture", () => {
    expect(
      displayedAudioTranscript(null, { hasAudio: true, allowFallback: false }),
    ).toBeNull();
  });

  it("returns null without audio", () => {
    expect(displayedAudioTranscript("", { hasAudio: false })).toBeNull();
  });
});
