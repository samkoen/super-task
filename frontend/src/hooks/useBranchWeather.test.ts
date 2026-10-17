import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useBranchWeather } from "./useBranchWeather";
import { fetchBranchWeather } from "../services/weatherService";

vi.mock("../services/weatherService", () => ({ fetchBranchWeather: vi.fn() }));

const fetchMock = vi.mocked(fetchBranchWeather);

describe("useBranchWeather", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("returns the weather once loaded", async () => {
    fetchMock.mockResolvedValue({ temperatureC: 20, code: 0, isDay: true, place: "חיפה" });
    const { result } = renderHook(() => useBranchWeather("חיפה"));
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current?.place).toBe("חיפה"));
    expect(fetchMock).toHaveBeenCalledWith("חיפה");
  });

  it("stays null when the service fails", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useBranchWeather(null));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });
});
