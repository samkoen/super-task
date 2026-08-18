import type { StoreCategoryKpi, StoreKpiKey, StoreKpis } from "../services/dashboardService";

export function emptyCategoryKpi(category: StoreKpiKey): StoreCategoryKpi {
  return {
    category,
    total: 0,
    reported: 0,
    approved: 0,
    remaining: 0,
    report_pct: 0,
    approval_pct: 0,
    open_pct: 0,
  };
}

export function resolveStoreKpis(kpis: StoreKpis | null | undefined): StoreKpis {
  return {
    general: kpis?.general ?? emptyCategoryKpi("general"),
    cleaning: kpis?.cleaning ?? emptyCategoryKpi("cleaning"),
    fronts_signage: kpis?.fronts_signage ?? emptyCategoryKpi("fronts_signage"),
    orders: kpis?.orders ?? emptyCategoryKpi("orders"),
    info_collection: kpis?.info_collection ?? emptyCategoryKpi("info_collection"),
  };
}

export function formatKpiPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function remainingCount(kpi: StoreCategoryKpi): number {
  if (typeof kpi.remaining === "number") return kpi.remaining;
  return Math.max(0, kpi.total - kpi.approved);
}
