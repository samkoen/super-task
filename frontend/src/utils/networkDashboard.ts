import type { ManagerDashboard } from "../services/dashboardService";

export function showAllWorkersDashboard(
  data: Pick<ManagerDashboard, "branch" | "manages_all_workers" | "task_queues">,
): boolean {
  return !data.branch && Boolean(data.manages_all_workers && data.task_queues);
}

export function homeBranchAfterOverview(opts: {
  canPickBranch: boolean;
  selectedBranch: string;
  overviewLoaded: boolean;
  managesAllWorkers?: boolean;
  homeBranchId?: string | null;
  onlyBranchId?: string;
  /** Le menahel a déjà choisi son périmètre (y compris « כל הרשת ») : on ne le remplace pas. */
  explicitChoice?: boolean;
}): string | null {
  if (!opts.canPickBranch || opts.selectedBranch || !opts.overviewLoaded || opts.managesAllWorkers || opts.explicitChoice) {
    return null;
  }
  return opts.homeBranchId || opts.onlyBranchId || null;
}
