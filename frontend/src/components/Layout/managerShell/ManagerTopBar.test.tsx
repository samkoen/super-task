import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerTopBar from "./ManagerTopBar";
import { he } from "../../../i18n/he";

vi.mock("../../notifications/NotificationBell", () => ({
  default: ({ renderTrigger }: { renderTrigger: (open: () => void, unread: number) => JSX.Element }) =>
    renderTrigger(() => undefined, 2),
}));
vi.mock("../../../hooks/useResolvedMediaSrc", () => ({ useResolvedMediaSrc: () => ({ src: null }) }));

function renderBar(showBack: boolean) {
  const handlers = { onBack: vi.fn(), onCreate: vi.fn(), onOpenMore: vi.fn() };
  render(<ManagerTopBar name="שמואל כהן" showBack={showBack} {...handlers} />);
  return handlers;
}

describe("ManagerTopBar", () => {
  it("opens create and more from the round button and the avatar", () => {
    const h = renderBar(false);
    fireEvent.click(screen.getByLabelText(he.managerCreate));
    fireEvent.click(screen.getByTestId("manager-topbar-more"));
    expect(h.onCreate).toHaveBeenCalledTimes(1);
    expect(h.onOpenMore).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("manager-topbar-more").textContent).toContain("שמואל");
  });

  it("shows back only off tab roots", () => {
    renderBar(false);
    expect(screen.queryByTestId("manager-topbar-back")).toBeNull();
  });

  it("shows the page title under the greeting only when the page declares one", () => {
    const { rerender } = render(<ManagerTopBar name="שמואל" showBack={false} onBack={vi.fn()} onCreate={vi.fn()} onOpenMore={vi.fn()} />);
    expect(screen.queryByTestId("manager-topbar-title")).toBeNull();
    rerender(<ManagerTopBar name="שמואל" title="סניף תל אביב" subtitle="יום שני" showBack={false} onBack={vi.fn()} onCreate={vi.fn()} onOpenMore={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "סניף תל אביב" })).toBeTruthy();
    expect(screen.getByTestId("manager-topbar-subtitle").textContent).toBe("יום שני");
  });

  it("goes back when the back button is shown", () => {
    const h = renderBar(true);
    fireEvent.click(screen.getByTestId("manager-topbar-back"));
    expect(h.onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("manager-topbar-bell")).toBeTruthy();
  });
});
