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
vi.mock("./FlowTaskChat", () => ({
  default: ({ open, occurrenceId, statuses, onClose }: { open: boolean; occurrenceId: string; statuses: string[]; onClose: () => void }) =>
    open ? (
      <div data-testid="task-chat" data-occurrence={occurrenceId} data-statuses={statuses.join(",")}>
        <button type="button" data-testid="task-chat-close" onClick={onClose} />
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

  it("keeps a card as soon as it is captured, without sending, and tells how many remain", async () => {
    const { onFinished } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-toast-subtitle").textContent).toBe(he.flowToastRemaining(1)));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByTestId("flow-tab-done").textContent).toContain(he.flowTabReady);
    expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1");
    expect(onFinished).not.toHaveBeenCalled();
  });

  it("sends everything only from the summary (אישור ושליחה), for an ordinary task too", async () => {
    send.mockResolvedValueOnce(response([1], false)).mockResolvedValueOnce(response([], true));
    const { onFinished } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1"));
    fireEvent.click(screen.getByTestId("flow-primary"));
    const sendButton = await screen.findByTestId("flow-summary-send");
    expect(sendButton.textContent).toBe(he.flowSummarySend);
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(sendButton);
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    const done = await screen.findByTestId("flow-summary-continue");
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(done);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("returns to the cards before sending, and the summary can be opened again", async () => {
    const { onFinished } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-primary"));
    await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1"));
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-summary-back"));
    expect(screen.getByTestId("task-flow")).toBeTruthy();
    expect(send).not.toHaveBeenCalled();
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("flow-open-summary"));
    expect(await screen.findByTestId("flow-summary-send")).toBeTruthy();
  });

  it("reopens a confirmed video, and the summary stays closed until it is confirmed again", async () => {
    const videos = [
      { kind: "video", title: "גיבוי", min_seconds: 5 },
      { kind: "video", title: "מקרר", min_seconds: 5 },
    ];
    renderScreen({}, videos);
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-review-confirm"));
    await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1"));
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-review-confirm"));
    fireEvent.click(await screen.findByTestId("flow-summary-back"));
    fireEvent.click(screen.getAllByTestId("flow-tab-done")[0]);
    expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("0");
    fireEvent.click(screen.getByTestId("flow-primary"));
    expect(await screen.findByTestId("flow-review")).toBeTruthy();
    expect(screen.queryByTestId("flow-open-summary")).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  it("shows the summary for a shift opening, then goes to the daily tasks after sending", async () => {
    send.mockResolvedValue(response([], true));
    const { onFinished } = renderScreen({ shiftOpening: true }, [{ kind: "photo", title: "מדף" }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-summary-send"));
    const done = await screen.findByTestId("flow-summary-continue");
    expect(done.textContent).toBe(he.flowSummaryStartDay);
    expect(onFinished).not.toHaveBeenCalled();
    fireEvent.click(done);
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("keeps the file on the device when offline: the summary shows it as waiting for upload", async () => {
    send.mockRejectedValue({ isAxiosError: true, code: "ERR_NETWORK", message: "Network Error" });
    renderScreen({}, [{ kind: "photo", title: "מדף" }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-summary-send"));
    await waitFor(() => expect(screen.getByTestId("flow-summary-pending")).toBeTruthy());
    expect(await queue.list("occ1")).toHaveLength(1);
    expect(screen.getAllByTestId("flow-summary-row")[0].textContent).toContain(he.flowTabWaiting);
  });

  it("reviews a video before keeping it: nothing is sent on confirm, only from the summary", async () => {
    send.mockResolvedValueOnce(response([], true));
    renderScreen({}, [{ kind: "video", title: "גיבוי", min_seconds: 10 }]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    expect(await screen.findByTestId("flow-review-video")).toBeTruthy();
    expect(screen.getByTestId("flow-review-confirm").textContent).toBe(he.flowReviewConfirm);
    fireEvent.click(screen.getByTestId("flow-review-confirm"));
    const sendButton = await screen.findByTestId("flow-summary-send");
    expect(send).not.toHaveBeenCalled();
    fireEvent.click(sendButton);
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

  it("has no chat icon on the subtask cards", () => {
    renderScreen();
    expect(screen.queryByTestId("flow-card-chat")).toBeNull();
  });

  it("opens this task's chat (not the general chat list) from the top icon, and closes it back to the flow", () => {
    const { onOpenChats } = renderScreen();
    expect(screen.queryByTestId("task-chat")).toBeNull();
    fireEvent.click(screen.getByTestId("task-flow-chats"));
    const chat = screen.getByTestId("task-chat");
    expect(chat.getAttribute("data-occurrence")).toBe("occ1");
    expect(chat.getAttribute("data-statuses")).toBe("idle,idle");
    expect(onOpenChats).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("task-chat-close"));
    expect(screen.queryByTestId("task-chat")).toBeNull();
  });

  it("opens the example sheet from the card link", () => {
    renderScreen({}, [{ kind: "photo", title: "מדף", example_url: "/e.png" }]);
    fireEvent.click(screen.getByTestId("flow-guide"));
    expect(screen.getByTestId("flow-guide-image").getAttribute("src")).toBe("/e.png");
  });

  it("shows the bottom nav and wires home and chat", () => {
    const { onClose, onOpenChats } = renderScreen();
    fireEvent.click(screen.getByTestId("flow-nav-chat"));
    expect(onOpenChats).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("flow-nav-home"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("goes back from the header", () => {
    const { onClose } = renderScreen();
    fireEvent.click(screen.getByTestId("task-flow-back"));
    expect(onClose).toHaveBeenCalled();
  });
});
