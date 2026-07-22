import { describe, expect, it } from "vitest";
import { emptyCategoryKpi, formatKpiPercent, resolveStoreKpis } from "./storeKpis";

describe("storeKpis", () => {
  it("returns zeros when API omits store_kpis", () => {
    const resolved = resolveStoreKpis(undefined);
    expect(resolved.cleaning).toEqual(emptyCategoryKpi("cleaning"));
    expect(resolved.fronts_signage.approval_pct).toBe(0);
  });

  it("keeps API values when present", () => {
    const resolved = resolveStoreKpis({
      cleaning: {
        category: "cleaning",
        total: 4,
        reported: 2,
        approved: 1,
        report_pct: 50,
        approval_pct: 25,
      },
      fronts_signage: emptyCategoryKpi("fronts_signage"),
    });
    expect(resolved.cleaning.approval_pct).toBe(25);
    expect(resolved.cleaning.report_pct).toBe(50);
  });

  it("formats percent for display", () => {
    expect(formatKpiPercent(58.2)).toBe("58%");
    expect(formatKpiPercent(0)).toBe("0%");
  });
});
