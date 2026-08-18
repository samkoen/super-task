import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StoreStatusKpiRow from "./StoreStatusKpiRow";
import { he } from "../../i18n/he";

describe("StoreStatusKpiRow", () => {
  it("shows general, cleaning, fronts and orders KPIs", () => {
    render(
      <StoreStatusKpiRow
        storeKpis={{
          general: {
            category: "general",
            total: 6,
            reported: 3,
            approved: 2,
            remaining: 4,
            report_pct: 50,
            approval_pct: 33,
            open_pct: 67,
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
          fronts_signage: {
            category: "fronts_signage",
            total: 2,
            reported: 1,
            approved: 0,
            remaining: 2,
            report_pct: 50,
            approval_pct: 0,
            open_pct: 100,
          },
          orders: {
            category: "orders",
            total: 1,
            reported: 0,
            approved: 0,
            remaining: 1,
            report_pct: 0,
            approval_pct: 0,
            open_pct: 100,
          },
          info_collection: {
            category: "info_collection",
            total: 2,
            reported: 1,
            approved: 1,
            remaining: 1,
            report_pct: 50,
            approval_pct: 50,
            open_pct: 50,
          },
        }}
      />,
    );

    expect(screen.getByText(he.dashboardKpiGeneral)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiCleaning)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiFronts)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiOrders)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiInfoCollection)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiRemainingLabel)).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiGoals)).toBeTruthy();
  });

  it("shows under-construction message when goals tile is clicked", () => {
    render(<StoreStatusKpiRow storeKpis={null} />);
    fireEvent.click(screen.getByText(he.dashboardKpiGoals));
    expect(screen.getByText(he.dashboardKpiUnderConstruction)).toBeTruthy();
  });
});
