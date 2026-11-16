import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "../services/api";
import { dashboardService } from "../services/dashboardService";
import { userService } from "../services/userService";
import { useManagerTeamData } from "./useManagerTeamData";

const auth = { user: { id: "m1", role: "network_manager", branch_id: null as string | null } };
vi.mock("../context/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("./useTaskChangeListener", () => ({ useTaskChangeListener: () => undefined }));
vi.mock("../services/dashboardService", () => ({ dashboardService: { getManager: vi.fn() } }));
vi.mock("../services/userService", () => ({ userService: { listTeam: vi.fn() } }));
vi.mock("../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([{ id: "b1", name: "TEST" }]) } }));

const wrapper = (path: string) => ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;
const users = [
  { id: "u1", full_name: "שמואל", role: "employee", branch_id: "b1", is_active: true },
  { id: "u2", full_name: "דנה", role: "employee", branch_id: "b2", is_active: true },
];

describe("useManagerTeamData", () => {
  beforeEach(() => {
    sessionStorage.clear();
    auth.user = { id: "m1", role: "network_manager", branch_id: null };
    vi.mocked(userService.listTeam).mockReset().mockResolvedValue(users as never);
    vi.mocked(dashboardService.getManager).mockReset().mockResolvedValue({
      team: [{ user_id: "u1", full_name: "שמואל", status: "in_progress", current_task_title: "ספירה", completed_today: 0, total_today: 1, timeline: [], overdue_backlog: [] }],
    } as never);
  });

  it("lists the oveds of the snif in the address with their state of the day", async () => {
    const { result } = renderHook(() => useManagerTeamData(), { wrapper: wrapper("/manager/employees?branch=b1") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(dashboardService.getManager).toHaveBeenCalledWith("b1", expect.any(String));
    expect(result.current.roster.map((e) => [e.id, e.state])).toEqual([["u1", "working"]]);
  });

  it("lists the whole network and reloads when a snif is picked", async () => {
    const { result } = renderHook(() => useManagerTeamData(), { wrapper: wrapper("/manager/employees") });
    await waitFor(() => expect(result.current.roster).toHaveLength(2));
    expect(dashboardService.getManager).toHaveBeenCalledWith(undefined, expect.any(String));
    act(() => result.current.setSelectedBranch("b1"));
    await waitFor(() => expect(dashboardService.getManager).toHaveBeenLastCalledWith("b1", expect.any(String)));
    await waitFor(() => expect(result.current.roster).toHaveLength(1));
  });

  it("keeps the list when the dashboard fails (no state of the day)", async () => {
    vi.mocked(dashboardService.getManager).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useManagerTeamData(), { wrapper: wrapper("/manager/employees") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("");
    expect(result.current.roster.every((e) => e.state === "unknown")).toBe(true);
  });

  it("shows the error when the accounts cannot be loaded", async () => {
    vi.mocked(userService.listTeam).mockRejectedValue(new ApiError("אין הרשאה", 403));
    const { result } = renderHook(() => useManagerTeamData(), { wrapper: wrapper("/manager/employees") });
    await waitFor(() => expect(result.current.error).toBe("אין הרשאה"));
  });

  it("keeps a branch manager on his own snif", async () => {
    auth.user = { id: "m2", role: "branch_manager", branch_id: "b1" };
    const { result } = renderHook(() => useManagerTeamData(), { wrapper: wrapper("/manager/employees?branch=b2") });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(dashboardService.getManager).toHaveBeenCalledWith(undefined, expect.any(String));
    expect(result.current.roster.map((e) => e.id)).toEqual(["u1"]);
  });
});
