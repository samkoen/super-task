import { describe, expect, it } from "vitest";
import {
  emptyCategoryKpi,
  formatKpiPercent,
  remainingCount,
  resolveStoreKpis,
} from "./storeKpis";

describe("storeKpis", () => {
  it("returns zeros when API omits store_kpis", () => {
    const resolved = resolveStoreKpis(undefined);
    expect(resolved.general).toEqual(emptyCategoryKpi("general"));
    expect(resolved.cleaning).toEqual(emptyCategoryKpi("cleaning"));
    expect(resolved.fronts_signage.approval_pct).toBe(0);
    expect(resolved.orders.total).toBe(0);
  });

  it("keeps provided KPI values", () => {
    const resolved = resolveStoreKpis({
      general: {
        category: "general",
        total: 8,
        reported: 5,
        approved: 3,
        remaining: 5,
        report_pct: 63,
        approval_pct: 38,
        open_pct: 63,
      },
      cleaning: {
        category: "cleaning",
        total: 4,
        reported: 2,
        approved: 1,
        remaining: 3,
        report_pct: 50,
        approval_pct: 25,
        open_pct: 75,
      },
      fronts_signage: emptyCategoryKpi("fronts_signage"),
      orders: emptyCategoryKpi("orders"),
    });
    expect(resolved.cleaning.approval_pct).toBe(25);
    expect(resolved.cleaning.report_pct).toBe(50);
    expect(resolved.general.remaining).toBe(5);
  });

  it("formats percent and remaining fallback", () => {
    expect(formatKpiPercent(25.4)).toBe("25%");
    expect(
      remainingCount({
        category: "general",
        total: 4,
        reported: 1,
        approved: 1,
        report_pct: 25,
        approval_pct: 25,
      }),
    ).toBe(3);
  });
});
