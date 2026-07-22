import type { OpsCategory, StoreCategoryKpi, StoreKpis } from "../services/dashboardService";

export function emptyCategoryKpi(category: OpsCategory): StoreCategoryKpi {
  return {
    category,
    total: 0,
    reported: 0,
    approved: 0,
    report_pct: 0,
    approval_pct: 0,
  };
}

export function resolveStoreKpis(kpis: StoreKpis | null | undefined): StoreKpis {
  return {
    cleaning: kpis?.cleaning ?? emptyCategoryKpi("cleaning"),
    fronts_signage: kpis?.fronts_signage ?? emptyCategoryKpi("fronts_signage"),
  };
}

export function formatKpiPercent(value: number): string {
  return `${Math.round(value)}%`;
}
