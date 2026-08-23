import { describe, expect, it, vi } from "vitest";
import { hintCacheKey, resolveLocalizedHint } from "./localizedHint";

describe("resolveLocalizedHint", () => {
  it("returns the original Hebrew text without calling translate", async () => {
    const translate = vi.fn(async () => "unused");
    const cache = new Map<string, string>();
    await expect(resolveLocalizedHint("לצלם את המדף", "he", translate, cache)).resolves.toBe(
      "לצלם את המדף",
    );
    expect(translate).not.toHaveBeenCalled();
  });

  it("translates once and reuses the cache", async () => {
    const translate = vi.fn(async () => "Take a photo of the shelf");
    const cache = new Map<string, string>();
    const first = await resolveLocalizedHint("לצלם את המדף", "en", translate, cache);
    const second = await resolveLocalizedHint("לצלם את המדף", "en", translate, cache);
    expect(first).toBe("Take a photo of the shelf");
    expect(second).toBe(first);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(cache.get(hintCacheKey("en", "לצלם את המדף"))).toBe(first);
  });
});
