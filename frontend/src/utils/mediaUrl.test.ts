import { describe, expect, it } from "vitest";
import { mediaUrl } from "./mediaUrl";

describe("mediaUrl", () => {
  it("returns null for empty path", () => {
    expect(mediaUrl(null)).toBeNull();
    expect(mediaUrl("")).toBeNull();
  });

  it("returns absolute URLs unchanged", () => {
    expect(mediaUrl("https://cdn.example.com/x.jpg")).toBe("https://cdn.example.com/x.jpg");
  });

  it("prefixes relative upload paths", () => {
    expect(mediaUrl("/uploads/task_photos/a.jpg")).toBe("/uploads/task_photos/a.jpg");
  });
});
