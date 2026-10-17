import { describe, expect, it } from "vitest";
import { isNightScene, sceneFromClock, sceneFromWeather } from "./weatherScene";

describe("sceneFromWeather", () => {
  it("maps clear sky to day or night", () => {
    expect(sceneFromWeather(0, true)).toBe("clear-day");
    expect(sceneFromWeather(0, false)).toBe("clear-night");
  });

  it("maps partly cloudy codes according to daylight", () => {
    expect(sceneFromWeather(2, true)).toBe("partly-day");
    expect(sceneFromWeather(1, false)).toBe("partly-night");
  });

  it("maps precipitation and fog regardless of daylight", () => {
    expect(sceneFromWeather(3, true)).toBe("cloudy");
    expect(sceneFromWeather(45, false)).toBe("fog");
    expect(sceneFromWeather(63, true)).toBe("rain");
    expect(sceneFromWeather(81, false)).toBe("rain");
    expect(sceneFromWeather(73, true)).toBe("snow");
    expect(sceneFromWeather(95, true)).toBe("storm");
  });

  it("falls back to a clear sky for unknown codes", () => {
    expect(sceneFromWeather(999, true)).toBe("clear-day");
  });
});

describe("sceneFromClock", () => {
  it("is day between 06:00 and 18:59", () => {
    expect(sceneFromClock(new Date(2026, 9, 15, 6, 0))).toBe("clear-day");
    expect(sceneFromClock(new Date(2026, 9, 15, 18, 59))).toBe("clear-day");
  });

  it("is night otherwise", () => {
    expect(sceneFromClock(new Date(2026, 9, 15, 5, 59))).toBe("clear-night");
    expect(sceneFromClock(new Date(2026, 9, 15, 19, 0))).toBe("clear-night");
  });
});

describe("isNightScene", () => {
  it("flags night scenes only", () => {
    expect(isNightScene("clear-night")).toBe(true);
    expect(isNightScene("partly-night")).toBe(true);
    expect(isNightScene("rain")).toBe(false);
  });
});
