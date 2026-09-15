import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PageErrorBoundary from "./PageErrorBoundary";
import { he } from "../../i18n/he";

function Boom(): null {
  throw new Error("boom");
}

describe("PageErrorBoundary", () => {
  it("shows a Hebrew fallback instead of a blank screen", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <PageErrorBoundary>
        <Boom />
      </PageErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain(he.pageCrashTitle);
    expect(screen.getByRole("alert").textContent).toContain("boom");
    expect(screen.getByRole("button", { name: he.pageCrashRetry })).toBeTruthy();
    spy.mockRestore();
  });

  it("asks to reload when a lazy chunk is stale", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Stale(): null {
      throw new Error(
        "Failed to fetch dynamically imported module: http://localhost:5173/src/pages/manager/ManagerFixedTasksPage.tsx",
      );
    }
    render(
      <PageErrorBoundary>
        <Stale />
      </PageErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain(he.pageCrashStaleChunk);
    spy.mockRestore();
  });
});
