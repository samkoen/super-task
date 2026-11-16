import { describe, expect, it } from "vitest";
import { BRANCH_RADIUS_M, distanceMeters, locationVerdict } from "./geoCheck";

const branch = { lat: 31.77, lng: 35.21 };
/** ≈ 1 m par 0,000009° de latitude. */
const north = (meters: number) => ({ lat: branch.lat + meters * 0.000009, lng: branch.lng });

describe("distanceMeters", () => {
  it("is zero for the same point and ~111 m per millidegree of latitude", () => {
    expect(distanceMeters(branch, branch)).toBeCloseTo(0, 3);
    expect(distanceMeters({ lat: 31, lng: 35 }, { lat: 31.001, lng: 35 })).toBeCloseTo(111.2, 0);
  });
});

describe("locationVerdict", () => {
  it("is at_branch inside the radius", () => {
    expect(locationVerdict(north(50), branch)).toBe("at_branch");
  });

  it("is away outside the radius", () => {
    expect(locationVerdict(north(BRANCH_RADIUS_M + 500), branch)).toBe("away");
  });

  it("tolerates a poor accuracy, but only up to a cap", () => {
    expect(locationVerdict({ ...north(BRANCH_RADIUS_M + 100), accuracy: 150 }, branch)).toBe("at_branch");
    expect(locationVerdict({ ...north(BRANCH_RADIUS_M + 900), accuracy: 5000 }, branch)).toBe("away");
  });

  it("is unknown without a position or without branch coordinates", () => {
    expect(locationVerdict(null, branch)).toBe("unknown");
    expect(locationVerdict(north(10), null)).toBe("unknown");
    expect(locationVerdict({ lat: Number.NaN, lng: 1 }, branch)).toBe("unknown");
  });
});
