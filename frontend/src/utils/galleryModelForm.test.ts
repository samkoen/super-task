import { describe, expect, it } from "vitest";
import { galleryStartUrlForForm, galleryStartUrlPayload } from "./galleryModelForm";

describe("galleryModelForm", () => {
  it("maps a stored start url into the gallery form", () => {
    expect(galleryStartUrlForForm("https://my.agroline.co.il/x")).toBe(
      "https://my.agroline.co.il/x",
    );
    expect(galleryStartUrlForForm(null)).toBe("");
  });

  it("sends a trimmed start url or omits an empty one", () => {
    expect(galleryStartUrlPayload("  https://my.agroline.co.il/x  ")).toBe(
      "https://my.agroline.co.il/x",
    );
    expect(galleryStartUrlPayload("")).toBeNull();
    expect(galleryStartUrlPayload("   ")).toBeNull();
  });
});
