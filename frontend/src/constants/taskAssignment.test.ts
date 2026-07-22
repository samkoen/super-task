import { describe, expect, it } from "vitest";
import { ASSIGN_TO_GALLERY, isAssignToGallery } from "./taskAssignment";

describe("taskAssignment", () => {
  it("detects gallery destination", () => {
    expect(isAssignToGallery(ASSIGN_TO_GALLERY)).toBe(true);
    expect(isAssignToGallery("user-1")).toBe(false);
    expect(isAssignToGallery("")).toBe(false);
  });
});
