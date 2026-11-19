import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatListRow from "./ChatListRow";
import { he } from "../../../i18n/he";

describe("ChatListRow", () => {
  it("shows the unread count instead of the pin", () => {
    render(<ChatListRow avatar={null} title="מדף" preview="שלום" unread={3} pinned onClick={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("true");
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.queryByLabelText(he.employeeChatPinned)).toBeNull();
  });

  it("pins a read general chat", () => {
    render(<ChatListRow avatar={null} title="כללי" preview="שלום" pinned onClick={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("false");
    expect(screen.getByLabelText(he.employeeChatPinned)).toBeTruthy();
  });

  it("puts the status tag before the preview and opens on tap", () => {
    const onClick = vi.fn();
    render(<ChatListRow avatar={null} title="סרטון" preview="חשוך" status="retake" onClick={onClick} />);
    expect(screen.getByText(he.employeeChatStatusRetake)).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
