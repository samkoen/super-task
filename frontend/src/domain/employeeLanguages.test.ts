import { describe, expect, it } from "vitest";
import { employeeLanguageLabel } from "./employeeLanguages";

describe("employeeLanguageLabel", () => {
  it("returns Hebrew label for he", () => {
    expect(employeeLanguageLabel("he")).toBe("עברית");
  });

  it("falls back to Hebrew when language is missing", () => {
    expect(employeeLanguageLabel(null)).toBe("עברית");
    expect(employeeLanguageLabel(undefined)).toBe("עברית");
  });

  it("returns label for supported languages", () => {
    expect(employeeLanguageLabel("fr")).toBe("צרפתית");
    expect(employeeLanguageLabel("th")).toBe("תאילנדית");
  });
});
