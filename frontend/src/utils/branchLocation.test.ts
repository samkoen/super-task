import { describe, expect, it } from "vitest";
import { coordinatesPayload, coordinatesToFields, emptyCoordinates, fieldsFromPosition } from "./branchLocation";

describe("branchLocation", () => {
  it("turns blank fields into nulls (clears the position)", () => {
    expect(coordinatesPayload(emptyCoordinates)).toEqual({ latitude: null, longitude: null });
  });

  it("parses numbers and keeps unreadable input for the server to refuse", () => {
    expect(coordinatesPayload({ latitude: " 31.77 ", longitude: "35.21" })).toEqual({ latitude: 31.77, longitude: 35.21 });
    expect(coordinatesPayload({ latitude: "abc", longitude: "35" })).toEqual({ latitude: "abc", longitude: 35 });
  });

  it("round-trips stored coordinates and rounds a device position to ~1 m", () => {
    expect(coordinatesToFields(31.77, 35.21)).toEqual({ latitude: "31.77", longitude: "35.21" });
    expect(coordinatesToFields(null, 35)).toEqual(emptyCoordinates);
    expect(fieldsFromPosition(31.7712345678, 35.2)).toEqual({ latitude: "31.771235", longitude: "35.200000" });
  });
});
