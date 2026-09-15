import { describe, expect, it } from "vitest";
import { isStaleChunkError } from "./staleChunkError";

describe("isStaleChunkError", () => {
  it("detects a failed lazy page import", () => {
    expect(
      isStaleChunkError(
        new Error(
          "Failed to fetch dynamically imported module: http://localhost:5173/src/pages/manager/ManagerFixedTasksPage.tsx",
        ),
      ),
    ).toBe(true);
  });

  it("ignores a normal render crash", () => {
    expect(isStaleChunkError(new Error("boom"))).toBe(false);
  });
});
