import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import TaskFlowScreen, { type TaskFlowScreenProps } from "./TaskFlowScreen";
import { he } from "../../i18n/he";
import { createMemorySlotStorage, createSlotUploadQueue } from "../../utils/slotUploadQueue";

const { submitSlot, uploadAudio } = vi.hoisted(() => ({ submitSlot: vi.fn(), uploadAudio: vi.fn() }));
const send = vi.fn();
let queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: (e) => send(e), isOnline: () => true });

vi.mock("../../utils/slotSender", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/slotSender")>()),
  getSlotUploadQueue: () => queue,
}));
vi.mock("../../services/taskService", () => ({ taskService: { submitSlot, uploadAudio } }));
vi.mock("../notifications/NotificationBell", () => ({ default: () => <span data-testid="bell" /> }));
vi.mock("./FlowTaskChat", () => ({ default: () => null }));
vi.mock("../media/MediaCaptureActions", () => ({
  default: ({ onCapture, trigger }: { onCapture: (file: File, kind: string) => void; trigger?: (open: () => void, s: { disabled: boolean }) => ReactNode }) => (
    <>{trigger?.(() => onCapture(new File(["x"], "p.bin"), "photo"), { disabled: false })}</>
  ),
}));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));
vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (p: string | null) => p }));

const photos = [
  { kind: "photo", title: "מדף" },
  { kind: "photo", title: "קופה" },
];

function renderScreen(extra: Partial<TaskFlowScreenProps> = {}) {
  const handlers = { onClose: vi.fn(), onFinished: vi.fn(), onOpenChats: vi.fn() };
  const task = { id: "occ1", title: "פתיחת משמרת", due_at: "2026-11-09T06:30:00", status: "pending", completion_requirements: photos };
  render(<TaskFlowScreen task={task as TaskFlowScreenProps["task"]} {...handlers} {...extra} />);
  return handlers;
}

async function skipFirstCard(code = "area_blocked") {
  fireEvent.click(screen.getByTestId("flow-skip"));
  fireEvent.click(await screen.findByTestId(`flow-skip-reason-${code}`));
  fireEvent.click(screen.getByTestId("flow-skip-confirm"));
  await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("1"));
}

beforeEach(() => {
  send.mockReset().mockResolvedValue({ pending_slots: [], task_submitted: true });
  submitSlot.mockReset().mockResolvedValue({ pending_slots: [], task_submitted: true });
  uploadAudio.mockReset();
  queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: (e) => send(e), isOnline: () => true });
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
});

describe("TaskFlowScreen: « לא ניתן לצלם »", () => {
  it("opens the sheet from the card and « אצלם אחר כך » leaves the card untouched", async () => {
    renderScreen();
    fireEvent.click(screen.getByTestId("flow-skip"));
    expect(await screen.findByTestId("flow-skip-heading")).toBeTruthy();
    fireEvent.click(screen.getByTestId("flow-skip-later"));
    await waitFor(() => expect(screen.queryByTestId("flow-skip-heading")).toBeNull());
    expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("0");
    expect(submitSlot).not.toHaveBeenCalled();
  });

  it("moves to the next card once the reason is reported, without sending anything yet", async () => {
    renderScreen();
    await skipFirstCard();
    expect(submitSlot).not.toHaveBeenCalled();
    expect(screen.getAllByTestId("flow-tab-done")[0]).toBeTruthy();
  });

  it("reaches a partial summary, sends the reason with the filmed card, and shows the confirmation popup", async () => {
    const { onFinished } = renderScreen({ shiftOpening: true });
    await skipFirstCard("no_stock");
    fireEvent.click(screen.getByTestId("flow-primary"));
    const sendButton = await screen.findByTestId("flow-summary-send");
    expect(screen.getByTestId("flow-summary-film-now")).toBeTruthy();
    expect(sendButton.textContent).toBe(he.flowSummarySend);

    fireEvent.click(sendButton);
    await waitFor(() => expect(submitSlot).toHaveBeenCalledWith("occ1", 0, { kind: "photo", skipped: { reason_code: "no_stock" } }));
    expect(send).toHaveBeenCalledTimes(1);
    expect((await screen.findByTestId("flow-sent-body")).textContent).toBe(he.flowSentBody(1));
    fireEvent.click(screen.getByTestId("flow-sent-continue"));
    expect(onFinished).toHaveBeenCalledTimes(1);
  });

  it("« לצלם עכשיו » frees the card again and goes back to it", async () => {
    renderScreen();
    await skipFirstCard();
    fireEvent.click(screen.getByTestId("flow-primary"));
    fireEvent.click(await screen.findByTestId("flow-summary-film-now"));
    await waitFor(() => expect(screen.getByTestId("flow-card").getAttribute("data-index")).toBe("0"));
    expect(screen.queryByTestId("flow-summary-send")).toBeNull();
    expect(submitSlot).not.toHaveBeenCalled();
  });
});
