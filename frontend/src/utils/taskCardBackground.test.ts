import { describe, expect, it } from "vitest";
import { taskCardBackgroundUrl } from "./taskCardBackground";

describe("taskCardBackgroundUrl", () => {
  it("returns null when no reference photo", () => {
    expect(taskCardBackgroundUrl(null)).toBeNull();
    expect(taskCardBackgroundUrl("")).toBeNull();
    expect(taskCardBackgroundUrl(undefined)).toBeNull();
  });

  it("keeps absolute http urls", () => {
    expect(taskCardBackgroundUrl("https://cdn.example/p.jpg")).toBe("https://cdn.example/p.jpg");
  });
});
