import { describe, expect, it } from "vitest";
import { pickSpeechVoice, resolveSpeechLanguage, speechLocaleCandidates } from "./speechVoice";

describe("speechVoice", () => {
  it("lists Arabic locale fallbacks", () => {
    expect(speechLocaleCandidates("ar")).toEqual(["ar-SA", "ar-EG", "ar-AE", "ar-KW", "ar"]);
  });

  it("picks exact Arabic voice match", () => {
    const voices = [
      { lang: "he-IL", name: "Hebrew" },
      { lang: "ar-EG", name: "Arabic Egypt" },
    ] as SpeechSynthesisVoice[];
    const picked = pickSpeechVoice(voices, "ar");
    expect(picked?.lang).toBe("ar-EG");
  });

  it("picks partial Arabic voice when exact locale missing", () => {
    const voices = [{ lang: "ar-SA", name: "Arabic" }] as SpeechSynthesisVoice[];
    expect(pickSpeechVoice(voices, "ar")?.lang).toBe("ar-SA");
  });

  it("uses Hebrew speech while translation is pending", () => {
    expect(resolveSpeechLanguage("ar", "ar", true)).toBe("he");
    expect(resolveSpeechLanguage("ar", "ar", false)).toBe("ar");
  });
});
