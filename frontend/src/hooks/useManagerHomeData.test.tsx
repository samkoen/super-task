import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { dashboardService } from "../services/dashboardService";
import { useManagerHomeData } from "./useManagerHomeData";

const auth = { user: { id: "m1", role: "network_manager", branch_id: null as string | null } };
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("../services/dashboardService", () => ({ dashboardService: { getManager: vi.fn() } }));
vi.mock("../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([{ id: "b1" }, { id: "b2" }]) } }));
vi.mock("../services/promotionStageService", () => ({ promotionStageService: { analysis: vi.fn().mockResolvedValue([]) } }));
vi.mock("../utils/notificationSounds", () => ({ playManagerQuestionSound: vi.fn() }));

const wrapper = (path: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;

describe("useManagerHomeData", () => {
  beforeEach(() => {
    sessionStorage.clear();
    auth.user = { id: "m1", role: "network_manager", branch_id: null };
    vi.mocked(dashboardService.getManager).mockReset().mockResolvedValue({ branch: null, task_queues: null } as never);
  });

  it("loads the whole network when no snif is in the address", async () => {
    const { result } = renderHook(() => useManagerHomeData(), { wrapper: wrapper("/manager") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(dashboardService.getManager).toHaveBeenCalledWith(undefined, expect.any(String));
    expect(result.current.canPickBranch).toBe(true);
  });

  it("loads the snif from the address and reloads when another one is picked", async () => {
    const { result } = renderHook(() => useManagerHomeData(), { wrapper: wrapper("/manager?branch=b2") });
    await waitFor(() => expect(dashboardService.getManager).toHaveBeenCalledWith("b2", expect.any(String)));
    act(() => result.current.setSelectedBranch("b1"));
    await waitFor(() => expect(dashboardService.getManager).toHaveBeenLastCalledWith("b1", expect.any(String)));
    expect(result.current.scopeBranchId).toBe("b1");
  });

  it("keeps a branch manager on his own snif", async () => {
    auth.user = { id: "m2", role: "branch_manager", branch_id: "b9" };
    const { result } = renderHook(() => useManagerHomeData(), { wrapper: wrapper("/manager?branch=b2") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(dashboardService.getManager).toHaveBeenCalledWith(undefined, expect.any(String));
    expect(result.current.scopeBranchId).toBe("b9");
  });

  it("shows the server error", async () => {
    const { ApiError } = await import("../services/api");
    vi.mocked(dashboardService.getManager).mockRejectedValue(new ApiError("שגיאה", 500));
    const { result } = renderHook(() => useManagerHomeData(), { wrapper: wrapper("/manager") });
    await waitFor(() => expect(result.current.error).toBe("שגיאה"));
  });
});
