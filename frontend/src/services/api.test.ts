import { describe, expect, it } from "vitest";
import api, { EMPTY_JSON_BODY } from "./api";

describe("api", () => {
  it("exports axios instance with a resolved baseURL", () => {
    expect(typeof api.defaults.baseURL).toBe("string");
    expect(api.defaults.baseURL?.length).toBeGreaterThan(0);
  });

  it("sends an empty JSON object for POST without payload (Android CapacitorHttp)", () => {
    expect(EMPTY_JSON_BODY).toEqual({});
    expect(EMPTY_JSON_BODY).toBeDefined();
    expect(JSON.stringify(EMPTY_JSON_BODY)).toBe("{}");
  });
});
