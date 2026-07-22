import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StoreStatusKpiRow from "./StoreStatusKpiRow";
import { he } from "../../i18n/he";

describe("StoreStatusKpiRow", () => {
  it("shows dual KPIs for cleaning and fronts", () => {
    render(
      <StoreStatusKpiRow
        storeKpis={{
          cleaning: {
            category: "cleaning",
            total: 4,
            reported: 2,
            approved: 1,
            report_pct: 50,
            approval_pct: 25,
          },
          fronts_signage: {
            category: "fronts_signage",
            total: 2,
            reported: 1,
            approved: 0,
            report_pct: 50,
            approval_pct: 0,
          },
        }}
      />
    );

    expect(screen.getByText(he.dashboardKpiCleaning)).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiFronts)).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    expect(screen.getByText(he.dashboardKpiGoals)).toBeTruthy();
  });

  it("shows under-construction message when goals tile is clicked", () => {
    render(<StoreStatusKpiRow storeKpis={null} />);
    fireEvent.click(screen.getByText(he.dashboardKpiGoals));
    expect(screen.getByText(he.dashboardKpiUnderConstruction)).toBeTruthy();
  });
});
