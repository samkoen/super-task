import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchBreakChange } from "../utils/employeeBreakMute";
import { employeeActivityService } from "../services/employeeActivityService";
import { useEmployeeBreakMute } from "./useEmployeeBreakMute";

vi.mock("../services/employeeActivityService", () => ({
  employeeActivityService: {
    getBreak: vi.fn(),
  },
}));

describe("useEmployeeBreakMute", () => {
  beforeEach(() => {
    vi.mocked(employeeActivityService.getBreak).mockReset();
  });

  it("follows getBreak then BREAK_CHANGE_EVENT", async () => {
    vi.mocked(employeeActivityService.getBreak).mockResolvedValue({
      on_break: false,
      on_break_since: null,
    });
    const { result } = renderHook(() => useEmployeeBreakMute(true));
    await waitFor(() => expect(result.current).toBe(false));
    act(() => dispatchBreakChange(true));
    expect(result.current).toBe(true);
  });

  it("stays unmuted when the hook is disabled", async () => {
    vi.mocked(employeeActivityService.getBreak).mockResolvedValue({
      on_break: true,
      on_break_since: "2026-08-28T10:00:00+03:00",
    });
    const { result } = renderHook(() => useEmployeeBreakMute(false));
    expect(result.current).toBe(false);
    expect(employeeActivityService.getBreak).not.toHaveBeenCalled();
  });
});
