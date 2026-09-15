import { describe, expect, it } from "vitest";
import { asList, asText } from "./asList";

describe("asList", () => {
  it("keeps a real array", () => {
    expect(asList([1, 2])).toEqual([1, 2]);
  });

  it("falls back to empty when the payload is not a list", () => {
    expect(asList(undefined)).toEqual([]);
    expect(asList({ items: [1] })).toEqual([]);
  });
});

describe("asText", () => {
  it("keeps strings and numbers, drops objects", () => {
    expect(asText("שלום")).toBe("שלום");
    expect(asText(3)).toBe("3");
    expect(asText({ he: "x" })).toBe("");
    expect(asText(null)).toBe("");
  });
});
