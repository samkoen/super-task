import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagerPillNav from "./ManagerPillNav";
import { he } from "../../../i18n/he";

function tabIds() {
  return Array.from(screen.getByTestId("manager-pill-nav").querySelectorAll("button")).map((b) => b.getAttribute("data-testid"));
}

describe("ManagerPillNav", () => {
  it("shows the four Figma tabs in pill order with the active one marked", () => {
    render(<ManagerPillNav active="team" chatUnread={0} onSelect={vi.fn()} />);
    expect(tabIds()).toEqual(["manager-pill-tasks", "manager-pill-team", "manager-pill-chats", "manager-pill-home"]);
    expect(screen.getByRole("navigation", { name: he.managerShellNavLabel })).toBeTruthy();
    expect(screen.getByLabelText(he.managerTabLabels.team).getAttribute("aria-current")).toBe("page");
    expect(screen.getByLabelText(he.managerTabLabels.home).getAttribute("aria-current")).toBeNull();
  });

  it("leaves every tab unmarked on pages of the more sheet", () => {
    render(<ManagerPillNav active={null} chatUnread={0} onSelect={vi.fn()} />);
    expect(screen.getByTestId("manager-pill-nav").querySelector("[aria-current]")).toBeNull();
  });

  it("calls onSelect with the tapped tab", () => {
    const onSelect = vi.fn();
    render(<ManagerPillNav active="home" chatUnread={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId("manager-pill-tasks"));
    expect(onSelect).toHaveBeenCalledWith("tasks");
  });

  it("shows the unread dot on chats only when messages wait", () => {
    const { rerender } = render(<ManagerPillNav active="home" chatUnread={0} onSelect={vi.fn()} />);
    expect(screen.queryByTestId("manager-pill-unread")).toBeNull();
    rerender(<ManagerPillNav active="home" chatUnread={3} onSelect={vi.fn()} />);
    expect(screen.getByTestId("manager-pill-unread").getAttribute("aria-label")).toBe(he.managerChatUnread(3));
  });
});
