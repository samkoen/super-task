import { describe, expect, it } from "vitest";
import api from "./api";

describe("api", () => {
  it("exports axios instance with a resolved baseURL", () => {
    expect(typeof api.defaults.baseURL).toBe("string");
    expect(api.defaults.baseURL?.length).toBeGreaterThan(0);
  });
});
