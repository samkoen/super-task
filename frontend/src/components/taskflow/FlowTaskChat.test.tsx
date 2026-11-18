import { CacheProvider } from "@emotion/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FlowTaskChat from "./FlowTaskChat";
import { emotionCache } from "../../emotion/caches";
import { he } from "../../i18n/he";
import { taskService } from "../../services/taskService";

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "emp-1", role: "employee", full_name: "אבי" } }),
}));
vi.mock("../../services/taskService", () => ({
  taskService: {
    listMessages: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
    uploadFile: vi.fn(),
  },
}));
vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));
vi.mock("../chat/ChatPhotoCapture", () => ({ default: () => null }));
vi.mock("../chat/ChatMessageMedia", () => ({ default: () => null }));

const reqs = [
  { kind: "video" as const, title: "מעבר בין המדפים" },
  { kind: "photo" as const, title: "ספירת מדפים" },
];

const message = (over: Record<string, unknown>) => ({
  id: "m",
  occurrence_id: "o1",
  sender_user_id: "mgr-1",
  sender_role: "branch_manager",
  created_at: new Date().toISOString(),
  ...over,
});

function renderChat(extra: Partial<Parameters<typeof FlowTaskChat>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <CacheProvider value={emotionCache}>
      <FlowTaskChat
        slotIndex={1}
        occurrenceId="o1"
        title="פתיחת משמרת"
        status="in_progress"
        managerName="רונית"
        requirements={reqs}
        pollMs={false}
        onClose={onClose}
        {...extra}
      />
    </CacheProvider>,
  );
  return { onClose };
}

beforeEach(() => {
  vi.mocked(taskService.listMessages).mockReset().mockResolvedValue({ messages: [], has_more: false } as never);
  vi.mocked(taskService.postMessage).mockReset().mockResolvedValue({ occurrence: { status: "awaiting_response" } } as never);
});

describe("FlowTaskChat (Figma 12ב, chat d'une sous-tâche)", () => {
  it("names the sub-task in the title and the task and manager in the subtitle", async () => {
    renderChat();
    expect(screen.getByTestId("flow-chat-title").textContent).toBe(he.flowChatHeaderTitle("ספירת מדפים"));
    expect(screen.getByTestId("flow-chat-subtitle").textContent).toBe(he.flowChatHeaderSub("רונית", "פתיחת משמרת"));
    expect(he.flowChatHeaderSub("רונית", "פתיחת משמרת")).toBe("פתיחת משמרת • רונית, מנהלת משמרת");
    await screen.findByTestId("flow-chat-empty");
  });

  it("is closed when no sub-task is chosen", () => {
    renderChat({ slotIndex: null });
    expect(screen.queryByTestId("flow-task-chat")).toBeNull();
  });

  it("shows this sub-task's messages and the general ones, not the other sub-tasks', without step tags", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
        message({ id: "m1", body: "בוקר טוב אבי" }),
        message({ id: "m2", sender_user_id: "emp-1", sender_role: "employee", body: "לסמן כחוסר?", slot_index: 1 }),
        message({ id: "m3", body: "על המעבר", slot_index: 0 }),
      ],
    } as never);
    renderChat();
    const bubbles = await screen.findAllByTestId("flow-chat-bubble");
    expect(bubbles.map((b) => b.getAttribute("data-mine"))).toEqual(["false", "true"]);
    expect(screen.queryByText("על המעבר")).toBeNull();
    expect(screen.queryByTestId("flow-chat-step-tag")).toBeNull();
    expect(screen.getByTestId("flow-chat-day")).toBeTruthy();
  });

  it("has no topic pills: every message goes to this sub-task", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    expect(screen.queryByTestId("flow-chat-choice")).toBeNull();
    expect(screen.getByPlaceholderText(he.flowChatPlaceholderTopic("ספירת מדפים"))).toBeTruthy();
    fireEvent.change(screen.getByTestId("flow-chat-input"), { target: { value: "אין טונה" } });
    fireEvent.click(screen.getByTestId("flow-chat-send"));
    await waitFor(() => expect(taskService.postMessage).toHaveBeenCalledWith("o1", { body: "אין טונה", slot_index: 1 }));
  });

  it("shows the mic while the field is empty and the send button once something is typed", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    expect(screen.getByTestId("flow-chat-mic")).toBeTruthy();
    expect(screen.queryByTestId("flow-chat-send")).toBeNull();
    fireEvent.keyDown(screen.getByTestId("flow-chat-input"), { key: "Enter" });
    expect(taskService.postMessage).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("flow-chat-input"), { target: { value: "שאלה" } });
    expect(screen.queryByTestId("flow-chat-mic")).toBeNull();
    expect(screen.getByTestId("flow-chat-send")).toBeTruthy();
  });

  it("keeps the thread readable but not writable once the task is closed", async () => {
    renderChat({ status: "completed" });
    await screen.findByTestId("flow-chat-empty");
    expect(screen.queryByTestId("flow-chat-composer")).toBeNull();
  });

  it("goes back to the task from the back button", async () => {
    const { onClose } = renderChat();
    await screen.findByTestId("flow-chat-empty");
    fireEvent.click(screen.getByTestId("flow-chat-back"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
