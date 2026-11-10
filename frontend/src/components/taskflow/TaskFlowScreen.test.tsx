import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import TaskFlowScreen, { type TaskFlowScreenProps } from "./TaskFlowScreen";
import { he } from "../../i18n/he";
import { createMemorySlotStorage, createSlotUploadQueue } from "../../utils/slotUploadQueue";

const send = vi.fn();
let queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: (e) => send(e), isOnline: () => true });

vi.mock("../../utils/slotSender", () => ({ getSlotUploadQueue: () => queue }));
vi.mock("../../services/taskService", () => ({ taskService: { submitSlot: vi.fn() } }));
vi.mock("../notifications/NotificationBell", () => ({ default: () => <span data-testid="bell" /> }));
vi.mock("../tasks/TaskChatDialog", () => ({
  default: ({ open, initialDraft, topSlot }: { open: boolean; initialDraft?: string; topSlot?: ReactNode }) =>
    open ? (
      <div data-testid="chat">
        {topSlot}
        <span data-testid="chat-draft">{initialDraft ?? ""}</span>
      </div>
    ) : null,
}));
vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    allowedKinds,
    onCapture,
    trigger,
  }: {
    allowedKinds?: string[];
    onCapture: (file: File, kind: string, meta?: { durationSeconds?: number }) => void;
    trigger?: (open: () => void, state: { disabled: boolean }) => ReactNode;
  }) => {
    const kind = allowedKinds?.[0] ?? "photo";
    const open = () => onCapture(new File(["x"], `${kind}.bin`), kind, kind === "video" ? { durationSeconds: 12 } : undefined);
    return <>{trigger?.(open, { disabled: false })}</>;
  },
}));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));
vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));

const task = (reqs: unknown[]) =>
  ({
    id: "occ1",
    title: "פתיחת משמרת",
    due_at: "2026-11-09T06:30:00",
    status: "pending",
    completion_requirements: reqs,
  }) as TaskFlowScreenProps["task"];

const photos = [
  { kind: "photo", title: "מדף" },
  { kind: "photo", title: "קופה" },
];

function renderScreen(extra: Partial<TaskFlowScreenProps> = {}, reqs: unknown[] = photos) {
  const handlers = { onClose: vi.fn(), onFinished: vi.fn(), onOpenChats: vi.fn() };
  render(<TaskFlowScreen task={task(reqs)} {...handlers} {...extra} />);
  return handlers;
}

const response = (pending: number[], submitted: boolean) => ({ pending_slots: pending, task_submitted: submitted });

beforeEach(() => {
  send.mockReset();
  queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: (e) => send(e), isOnline: () => true });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
});

describe("TaskFlowScreen", () => {
  it("shows the task title, the due hour and one card per configured requirement", () => {
    renderScreen();
    expect(screen.getByTestId("task-flow-title").textContent).toBe("פתיחת משמרת");
    expect(screen.getByTestId("task-flow-due").textContent).toBe(he.flowDueAtHour("6:30"));
    expect(screen.getByTestId("flow-card").textContent).toContain("מדף");
    expect(screen.getAllByTestId("flow-tab-next")).toHaveLength(1);
  });

  it("sends a card as soon as it is captured and tells how many remain", async () => {
    send.mockResolvedValueOnce(response([1], false));
    const { onFinished } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-toast-subtitle").textContent).toBe(he.flowToastRemaining(1)));
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("flow-tab-done").textContent).toContain(he.flowTabSent(""));
    expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1");
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("returns to the tasks once every card of an ordinary task is sent", async () => {
    send.mockResolvedValueOnce(response([1], false)).mockResolvedValueOnce(response([], true));
    const { onFinished } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1"));
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
  });

  it("shows the summary for a shift opening, then goes to the daily tasks", async () => {
    send.mockResolvedValue(response([], true));
    const { onFinished } = renderScreen({ shiftOpening: true }, [{ kind: "photo", title: "מדף" }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-summary")).toBeTruthy());
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("flow-summary-continue"));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("keeps the file on the device when offline and shows the saved toast", async () => {
    send.mockRejectedValue({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" });
    renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-toast-title").textContent).toBe(he.flowToastSavedOnDevice));
    expect(await queue.list("occ1")).toHaveLength(1);
    expect(screen.getByTestId("flow-tab-done").textContent).toContain(he.flowTabWaiting);
  });

  it("reviews a video before sending it, and blocks a video that is too short", async () => {
    send.mockResolvedValueOnce(response([], true));
    renderScreen({}, [{ kind: "video", title: "גיבוי", min_seconds: 10 }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    expect(await screen.findByTestId("flow-review-video")).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("flow-review-confirm"));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
  });

  it("discards the filmed video and reopens the camera on retake", async () => {
    renderScreen({}, [{ kind: "video", title: "גיבוי" }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-review-retake"));
    // Le mock de capture refilme aussitôt : une 2e prévisualisation prouve que la caméra a été rouverte.
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
    expect(send).not.toHaveBeenCalled();
  });

  it("opens the chat from the card icon on that subtask, and the chat list from the top icon", () => {
    const { onOpenChats } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-card-chat"));
    expect(screen.getByTestId("chat-draft").textContent).toBe(he.subtaskQuestionDraft("מדף"));
    fireEvent.click(screen.getByTestId("task-flow-chats"));
    expect(onOpenChats).toHaveBeenCalledTimes(1);
  });

  it("opens the example sheet from the card link", () => {
    renderScreen({}, [{ kind: "photo", title: "מדף", example_url: "/e.png" }]);
    fireEvent.click(screen.getByTestId("flow-guide"));
    expect(screen.getByTestId("flow-guide-image").getAttribute("src")).toBe("/e.png");
  });

  it("goes back from the header", () => {
    const { onClose } = renderScreen();
    fireEvent.click(screen.getByTestId("task-flow-back"));
    expect(onClose).toHaveBeenCalled();
  });
});
