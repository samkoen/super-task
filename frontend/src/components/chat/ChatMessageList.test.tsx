import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatMessageList from "./ChatMessageList";
import { he } from "../../i18n/he";
import { chatDayLabel, messageDayKey } from "../../utils/chatDay";
import type { ChatMessageView } from "../../utils/chatMessageView";

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => path ?? null,
}));

function msg(extra: Partial<ChatMessageView> = {}): ChatMessageView {
  return {
    id: extra.id ?? "m1",
    sender_user_id: extra.sender_user_id ?? "mgr-1",
    sender_name: extra.sender_name ?? "מנהל",
    body: extra.body ?? "",
    created_at: extra.created_at ?? "2026-09-03T10:00:00Z",
    ...extra,
  };
}

describe("ChatMessageList", () => {
  it("loads older messages from the shared button", () => {
    const onLoadOlder = vi.fn();
    render(
      <ChatMessageList
        messages={[msg({ body: "חדש" })]}
        hasMore
        loadingOlder={false}
        onLoadOlder={onLoadOlder}
        bottomRef={{ current: null }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.chatLoadOlder }));
    expect(onLoadOlder).toHaveBeenCalled();
  });

  it("offers annotate-and-send only on a received photo", () => {
    const onAnnotateReply = vi.fn();
    render(
      <ChatMessageList
        messages={[
          msg({ id: "in", photo_url: "/uploads/from-mgr.jpg" }),
          msg({ id: "mine", sender_user_id: "emp-1", sender_name: "עובד", photo_url: "/uploads/mine.jpg" }),
        ]}
        myId="emp-1"
        hasMore={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        bottomRef={{ current: null }}
        onAnnotateReply={onAnnotateReply}
      />,
    );
    expect(screen.getAllByRole("button", { name: he.chatAnnotateReply })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: he.chatAnnotateReply }));
    expect(onAnnotateReply).toHaveBeenCalledWith("/uploads/from-mgr.jpg");
  });

  it("hides annotate when compose is closed", () => {
    render(
      <ChatMessageList
        messages={[msg({ photo_url: "/uploads/from-mgr.jpg" })]}
        myId="emp-1"
        hasMore={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        bottomRef={{ current: null }}
        composeEnabled={false}
        onAnnotateReply={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: he.chatAnnotateReply })).toBeNull();
  });

  it("shows the translated body when highlighting an employee message", () => {
    render(
      <ChatMessageList
        messages={[msg({
          sender_user_id: "emp-1",
          sender_role: "employee",
          sender_name: "עובד",
          body: "hello",
          display_body: "שלום",
        })]}
        myId="mgr-1"
        hasMore={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        bottomRef={{ current: null }}
        highlightEmployee
      />,
    );
    expect(screen.getByText("שלום")).toBeTruthy();
    expect(screen.queryByText("hello")).toBeNull();
  });

  it("shows one WhatsApp-style date chip per day", () => {
    const older = "2026-07-23T10:00:00+03:00";
    const later = "2026-07-24T09:00:00+03:00";
    render(
      <ChatMessageList
        messages={[
          msg({ id: "a", body: "ישן", created_at: older }),
          msg({ id: "b", body: "עוד", created_at: older }),
          msg({ id: "c", body: "חדש", created_at: later }),
        ]}
        hasMore={false}
        loadingOlder={false}
        onLoadOlder={vi.fn()}
        bottomRef={{ current: null }}
      />,
    );
    const first = chatDayLabel(messageDayKey(older));
    const second = chatDayLabel(messageDayKey(later));
    expect(screen.getAllByRole("separator", { name: first })).toHaveLength(1);
    expect(screen.getAllByRole("separator", { name: second })).toHaveLength(1);
  });
});
