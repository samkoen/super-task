import { describe, expect, it } from "vitest";
import { emotionCache } from "./caches";

describe("emotionCache", () => {
  it("insère un style ::placeholder sans planter", () => {
    const serialized = {
      name: "placeholder-probe",
      styles: "input::placeholder{color:red;opacity:1}",
      next: undefined,
    };
    expect(() => emotionCache.insert("", serialized, emotionCache.sheet, false)).not.toThrow();
  });
});
