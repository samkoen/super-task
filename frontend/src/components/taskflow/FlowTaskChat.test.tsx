import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import FlowTaskChat from "./FlowTaskChat";
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
    <FlowTaskChat
      open
      occurrenceId="o1"
      title="בדיקת מלאי במחלקה"
      status="in_progress"
      managerName="רונית"
      requirements={reqs}
      statuses={["sent", "idle"]}
      pollMs={false}
      onClose={onClose}
      {...extra}
    />,
  );
  return { onClose };
}

beforeEach(() => {
  vi.mocked(taskService.listMessages).mockReset().mockResolvedValue({ messages: [], has_more: false } as never);
  vi.mocked(taskService.postMessage).mockReset().mockResolvedValue({ occurrence: { status: "awaiting_response" } } as never);
});

describe("FlowTaskChat (Figma 12)", () => {
  it("shows the task title, the manager and the progress of the task", async () => {
    renderChat();
    expect(screen.getByTestId("flow-chat-title").textContent).toBe("בדיקת מלאי במחלקה");
    expect(screen.getByTestId("flow-chat-subtitle").textContent).toBe(he.flowChatTitleSub("רונית"));
    expect(screen.getByTestId("flow-chat-status").textContent).toBe(he.flowChatStatus(2, 2));
    const bars = Array.from(screen.getByTestId("flow-chat-bars").children).map((el) => el.getAttribute("data-state"));
    expect(bars).toEqual(["done", "current"]);
    await screen.findByTestId("flow-chat-empty");
  });

  it("renders manager bubbles apart from mine, with the step tag when a message targets a step", async () => {
    vi.mocked(taskService.listMessages).mockResolvedValue({
      has_more: false,
      messages: [
        message({ id: "m1", body: "בוקר טוב אבי" }),
        message({ id: "m2", sender_user_id: "emp-1", sender_role: "employee", body: "לסמן כחוסר?", slot_index: 1 }),
      ],
    } as never);
    renderChat();
    const bubbles = await screen.findAllByTestId("flow-chat-bubble");
    expect(bubbles.map((b) => b.getAttribute("data-mine"))).toEqual(["false", "true"]);
    expect(within(bubbles[0]).queryByTestId("flow-chat-step-tag")).toBeNull();
    expect(within(bubbles[1]).getByTestId("flow-chat-step-tag").textContent).toBe(he.flowChatStepTag(2, "ספירת מדפים"));
    expect(screen.getByTestId("flow-chat-day")).toBeTruthy();
  });

  it("offers « כללי » then one chip per step, general selected by default", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    const chips = screen.getAllByTestId("flow-chat-choice");
    expect(chips.map((c) => c.textContent)).toEqual([he.flowChatGeneral, he.flowChatChip(1, "מעבר בין המדפים"), he.flowChatChip(2, "ספירת מדפים")]);
    expect(chips.map((c) => c.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
  });

  it("sends the message to the step selected in the chips", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    fireEvent.click(screen.getAllByTestId("flow-chat-choice")[2]);
    fireEvent.change(screen.getByTestId("flow-chat-input"), { target: { value: "אין טונה" } });
    fireEvent.click(screen.getByTestId("flow-chat-send"));
    await waitFor(() => expect(taskService.postMessage).toHaveBeenCalledWith("o1", { body: "אין טונה", slot_index: 1 }));
  });

  it("sends a general message without any step", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    fireEvent.change(screen.getByTestId("flow-chat-input"), { target: { value: "שאלה כללית" } });
    fireEvent.click(screen.getByTestId("flow-chat-send"));
    await waitFor(() => expect(taskService.postMessage).toHaveBeenCalledWith("o1", { body: "שאלה כללית" }));
  });

  it("does not send an empty message", async () => {
    renderChat();
    await screen.findByTestId("flow-chat-empty");
    expect((screen.getByTestId("flow-chat-send") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.keyDown(screen.getByTestId("flow-chat-input"), { key: "Enter" });
    expect(taskService.postMessage).not.toHaveBeenCalled();
  });

  it("hides the step chips when the task has no step", async () => {
    renderChat({ requirements: [], statuses: [] });
    await screen.findByTestId("flow-chat-empty");
    expect(screen.queryByTestId("flow-chat-picker")).toBeNull();
    expect(screen.getByTestId("flow-chat-status").textContent).toBe(he.flowChatStatusPlain);
  });

  it("keeps the thread readable but not writable once the task is closed", async () => {
    renderChat({ status: "completed" });
    await screen.findByTestId("flow-chat-empty");
    expect(screen.queryByTestId("flow-chat-composer")).toBeNull();
  });

  it("goes back to the task from the back button and from « לפרטי המשימה »", async () => {
    const { onClose } = renderChat();
    await screen.findByTestId("flow-chat-empty");
    fireEvent.click(screen.getByTestId("flow-chat-back"));
    fireEvent.click(screen.getByTestId("flow-chat-task-link"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
