import { describe, expect, it } from "vitest";
import { captureVideoPoster } from "./videoPoster";

describe("captureVideoPoster", () => {
  it("returns null for an empty source", async () => {
    expect(await captureVideoPoster("")).toBeNull();
  });
});
