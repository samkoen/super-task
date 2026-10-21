import { describe, expect, it } from "vitest";
import { parseRetentionDays } from "./mediaRetentionDays";

describe("parseRetentionDays", () => {
  it("accepts a whole number of days inside the limit", () => {
    expect(parseRetentionDays("0")).toBe(0);
    expect(parseRetentionDays(" 14 ")).toBe(14);
    expect(parseRetentionDays("365")).toBe(365);
  });

  it("rejects an empty value, a fraction, and a number past the limit", () => {
    expect(parseRetentionDays("")).toBeNull();
    expect(parseRetentionDays("1.5")).toBeNull();
    expect(parseRetentionDays("-3")).toBeNull();
    expect(parseRetentionDays("366")).toBeNull();
  });
});
