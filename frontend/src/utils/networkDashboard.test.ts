import { describe, expect, it } from "vitest";
import { homeBranchAfterOverview, showAllWorkersDashboard } from "./networkDashboard";

describe("networkDashboard", () => {
  it("shows the all-workers board only on the network overview when the flag is on", () => {
    expect(
      showAllWorkersDashboard({
        branch: null,
        manages_all_workers: true,
        task_queues: { completed: [], in_progress: [], pending_review: [], upcoming: [] },
      }),
    ).toBe(true);
    expect(
      showAllWorkersDashboard({
        branch: { id: "b1", name: "שפע", network_id: "n1" },
        manages_all_workers: true,
        task_queues: { completed: [], in_progress: [], pending_review: [], upcoming: [] },
      }),
    ).toBe(false);
    expect(
      showAllWorkersDashboard({ branch: null, manages_all_workers: false, task_queues: null }),
    ).toBe(false);
  });

  it("does not jump into a home snif when the reshet manages all ovdim", () => {
    expect(
      homeBranchAfterOverview({
        canPickBranch: true,
        selectedBranch: "",
        overviewLoaded: true,
        managesAllWorkers: true,
        homeBranchId: "b1",
      }),
    ).toBeNull();
    expect(
      homeBranchAfterOverview({
        canPickBranch: true,
        selectedBranch: "",
        overviewLoaded: true,
        managesAllWorkers: false,
        homeBranchId: "b1",
      }),
    ).toBe("b1");
    expect(
      homeBranchAfterOverview({
        canPickBranch: true,
        selectedBranch: "",
        overviewLoaded: false,
        homeBranchId: "b1",
      }),
    ).toBeNull();
  });
});
