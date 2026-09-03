import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { he } from "../../i18n/he";
import type { ChatThreadState } from "../../hooks/useChatThread";
import ChatThread from "./ChatThread";

vi.mock("./ChatComposerBar", async () => {
  const { he: labels } = await import("../../i18n/he");
  return {
    default: (props: {
      body: string;
      placeholder?: string;
      sendLabel?: string;
      onBodyChange: (value: string) => void;
      onSendText: () => void;
    }) => (
      <>
        <input
          placeholder={props.placeholder ?? labels.taskChatPlaceholder}
          value={props.body}
          onChange={(e) => props.onBodyChange(e.target.value)}
        />
        <button type="button" onClick={props.onSendText}>
          {props.sendLabel ?? labels.taskChatSend}
        </button>
      </>
    ),
  };
});

function thread(overrides: Partial<ChatThreadState> = {}): ChatThreadState {
  return {
    messages: [],
    hasMore: false,
    loading: false,
    loadingOlder: false,
    loadLatest: vi.fn(),
    loadOlder: vi.fn(),
    stickToBottom: { current: true },
    body: "",
    setBody: vi.fn(),
    sending: false,
    error: "",
    breakAlert: null,
    setBreakAlert: vi.fn(),
    bottomRef: { current: null },
    sendText: vi.fn(),
    sendMedia: vi.fn(),
    annotateReply: { photoUrl: null, start: vi.fn(), close: vi.fn(), submit: vi.fn() },
    runBusy: vi.fn(),
    ...overrides,
  } as ChatThreadState;
}

describe("ChatThread", () => {
  it("shows the empty state then sends from the composer", () => {
    const state = thread();
    render(
      <ChatThread
        thread={state}
        emptyText={he.directChatEmpty}
        placeholder={he.directChatPlaceholder}
      />,
    );
    expect(screen.getByText(he.directChatEmpty)).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(he.directChatPlaceholder), {
      target: { value: "שלום" },
    });
    fireEvent.click(screen.getByText(he.taskChatSend));
    expect(state.setBody).toHaveBeenCalledWith("שלום");
    expect(state.sendText).toHaveBeenCalled();
  });

  it("hides the list in broadcast mode and keeps the hint", () => {
    render(
      <ChatThread
        thread={thread({ loading: true })}
        emptyText={he.directChatEmpty}
        hideList
        sendLabel={he.directChatBroadcast}
        banner={<div>{he.directChatBroadcastHint}</div>}
      />,
    );
    expect(screen.getByText(he.directChatBroadcastHint)).toBeTruthy();
    expect(screen.queryByText(he.directChatEmpty)).toBeNull();
    expect(screen.getByRole("button", { name: he.directChatBroadcast })).toBeTruthy();
  });
});
