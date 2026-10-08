import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ManagerSummaryStrip from "./ManagerSummaryStrip";
import { he } from "../../i18n/he";
import type { ManagerSummary } from "../../utils/managerSummary";

const summary: ManagerSummary = {
  reviews: 3,
  messages: 0,
  overdue: 2,
  completed: 6,
  total: 8,
  completionPct: 75,
};

describe("ManagerSummaryStrip", () => {
  it("shows the four key figures and highlights what needs attention", () => {
    render(<ManagerSummaryStrip summary={summary} />);
    const region = screen.getByRole("region", { name: he.managerSummaryLabel });
    expect(region).toBeTruthy();

    const reviews = screen.getByTestId("manager-summary-reviews");
    expect(within(reviews).getByText(he.managerSummaryReviews)).toBeTruthy();
    expect(within(reviews).getByText("3")).toBeTruthy();
    expect(reviews.getAttribute("data-active")).toBe("true");

    expect(screen.getByTestId("manager-summary-overdue").getAttribute("data-active")).toBe("true");
    expect(screen.getByText("75%")).toBeTruthy();
    expect(screen.getByText(he.managerSummaryCompletionOf(6, 8))).toBeTruthy();
  });

  it("keeps zero counters neutral instead of alarming", () => {
    render(<ManagerSummaryStrip summary={summary} />);
    const messages = screen.getByTestId("manager-summary-messages");
    expect(within(messages).getByText("0")).toBeTruthy();
    expect(messages.getAttribute("data-active")).toBe("false");
  });

  it("renders an empty day without crashing", () => {
    render(
      <ManagerSummaryStrip
        summary={{ reviews: 0, messages: 0, overdue: 0, completed: 0, total: 0, completionPct: 0 }}
      />,
    );
    expect(screen.getByText("0%")).toBeTruthy();
    expect(screen.getByTestId("manager-summary-reviews").getAttribute("data-active")).toBe("false");
  });
});
