import { describe, expect, it } from "vitest";
import api from "./api";

describe("api", () => {
  it("exports axios instance with /api baseURL", () => {
    expect(api.defaults.baseURL).toBe("/api");
  });
});
