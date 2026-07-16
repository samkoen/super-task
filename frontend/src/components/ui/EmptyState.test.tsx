import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="אין משימות" description="נסו לשנות מסנן" />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("אין משימות")).toBeTruthy();
    expect(screen.getByText("נסו לשנות מסנן")).toBeTruthy();
  });

  it("calls onAction when CTA clicked", () => {
    const onAction = vi.fn();
    render(<EmptyState title="ריק" actionLabel="צור" onAction={onAction} />);
    fireEvent.click(screen.getByRole("button", { name: "צור" }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
