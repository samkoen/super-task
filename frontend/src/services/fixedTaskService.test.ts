import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "./api";
import { fixedTaskService } from "./fixedTaskService";

vi.mock("./api", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

describe("fixedTaskService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists tasks, optionally filtered by branch, and tolerates a non-array body", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: [{ key: "g1" }] });
    expect(await fixedTaskService.list("b1")).toEqual([{ key: "g1" }]);
    expect(api.get).toHaveBeenCalledWith("/fixed-tasks", { params: { branch_id: "b1" } });
    vi.mocked(api.get).mockResolvedValueOnce({ data: null });
    expect(await fixedTaskService.list()).toEqual([]);
    expect(api.get).toHaveBeenLastCalledWith("/fixed-tasks", { params: undefined });
  });

  it("reads one task by key", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { key: "g1" } });
    expect(await fixedTaskService.get("g1")).toEqual({ key: "g1" });
    expect(api.get).toHaveBeenCalledWith("/fixed-tasks/g1");
  });

  it("sends general settings to the defaults endpoint", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { key: "g1" } });
    const payload = { title: "ת", description: "", due_time: "09:00", is_active: true };
    await fixedTaskService.updateDefaults("g1", payload);
    expect(api.patch).toHaveBeenCalledWith("/fixed-tasks/g1/defaults", payload);
  });

  it("sends a branch adaptation with changes and resets", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: { template_id: "t1" } });
    await fixedTaskService.updateBranch("t1", { changes: { due_time: "07:30" }, reset: ["is_active"] });
    expect(api.patch).toHaveBeenCalledWith("/fixed-tasks/branches/t1", {
      changes: { due_time: "07:30" },
      reset: ["is_active"],
    });
  });
});
