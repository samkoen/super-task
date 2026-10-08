import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatInboxRow from "./ChatInboxRow";
import { he } from "../../i18n/he";

describe("ChatInboxRow", () => {
  it("highlights unread conversations and shows the count", () => {
    render(<ChatInboxRow title="דן כהן" preview="שלום" lastAt={null} unreadCount={4} onClick={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("true");
    expect(screen.getByText("4")).toBeTruthy();
  });

  it("shows the friendly empty preview and no badge when nothing is new", () => {
    render(<ChatInboxRow title="דן כהן" preview="" lastAt={null} unreadCount={0} onClick={vi.fn()} />);
    expect(screen.getByRole("button").getAttribute("data-unread")).toBe("false");
    expect(screen.getByText(he.chatRowEmpty)).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
  });

  it("renders the branch tag next to the title and opens on tap", () => {
    const onClick = vi.fn();
    render(
      <ChatInboxRow
        title="דן כהן"
        preview="שלום"
        lastAt={null}
        unreadCount={0}
        onClick={onClick}
        titleExtra={<span>תל אביב</span>}
      />,
    );
    expect(screen.getByText("תל אביב")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
