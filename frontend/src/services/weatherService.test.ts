import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { clearWeatherCache, fetchBranchWeather } from "./weatherService";

vi.mock("axios", () => ({ default: { get: vi.fn() } }));

const get = vi.mocked(axios.get);

function forecast(code = 0, temp = 21.4, isDay = 1) {
  return { data: { current: { temperature_2m: temp, weather_code: code, is_day: isDay } } };
}

describe("fetchBranchWeather", () => {
  beforeEach(() => {
    get.mockReset();
    clearWeatherCache();
  });

  it("geocodes the branch city then reads the current weather", async () => {
    get
      .mockResolvedValueOnce({ data: { results: [{ latitude: 32.08, longitude: 34.78 }] } })
      .mockResolvedValueOnce(forecast(61, 17.6, 0));
    const weather = await fetchBranchWeather("תל אביב");
    expect(weather).toEqual({ temperatureC: 17.6, code: 61, isDay: false, place: "תל אביב" });
    expect(get.mock.calls[1][1]).toMatchObject({ params: { latitude: 32.08, longitude: 34.78 } });
  });

  it("falls back to Jerusalem when the city is empty", async () => {
    get.mockResolvedValueOnce(forecast());
    const weather = await fetchBranchWeather("  ");
    expect(weather.place).toBe("ירושלים");
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1]).toMatchObject({ params: { latitude: 31.7683, longitude: 35.2137 } });
  });

  it("falls back to Jerusalem when the city is not found", async () => {
    get.mockResolvedValueOnce({ data: {} }).mockResolvedValueOnce(forecast());
    expect((await fetchBranchWeather("עיר לא קיימת")).place).toBe("ירושלים");
  });

  it("caches the result and rejects when the forecast fails", async () => {
    get.mockResolvedValueOnce(forecast());
    await fetchBranchWeather("");
    await fetchBranchWeather("");
    expect(get).toHaveBeenCalledTimes(1);

    clearWeatherCache();
    get.mockRejectedValueOnce(new Error("offline"));
    await expect(fetchBranchWeather("")).rejects.toThrow("offline");
  });
});
