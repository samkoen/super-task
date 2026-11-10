import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import TaskCardStack, { type TaskCardStackProps } from "./TaskCardStack";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { SlotUiState } from "../../utils/slotUploadState";

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
vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (path: string | null) => path }));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));

const videos = (n: number): CompletionRequirement[] =>
  Array.from({ length: n }, (_, i) => ({ kind: "video" as const, title: `וידאו ${i + 1}`, min_seconds: 5 }));

const idle = (kind: SlotUiState["kind"] = "video"): SlotUiState => ({ status: "idle", kind });
const sent = (): SlotUiState => ({ status: "sent", kind: "video", sentAt: "2026-11-09T06:43:00" });

function renderStack(requirements: CompletionRequirement[], states: SlotUiState[], extra: Partial<TaskCardStackProps> = {}) {
  const handlers = {
    onCapture: vi.fn(),
    onSendText: vi.fn(),
    onOpenGuide: vi.fn(),
    onChat: vi.fn(),
  };
  render(<TaskCardStack requirements={requirements} states={states} {...handlers} {...extra} />);
  return handlers;
}

describe("TaskCardStack", () => {
  it("shows the first open card and one folded tab per remaining card, titles from the config", () => {
    renderStack(videos(3), [idle(), idle(), idle()]);
    expect((screen.getByTestId("flow-card")).textContent).toContain("וידאו 1");
    const tabs = screen.getAllByTestId("flow-tab-next");
    expect(tabs).toHaveLength(2);
    expect((tabs[0]).textContent).toContain("02 · וידאו 2");
  });

  it("widens the tabs toward the card: 315 px next to it, 272 px for the last one (Figma)", () => {
    renderStack(videos(3), [idle(), idle(), idle()]);
    const tabs = screen.getAllByTestId("flow-tab-next");
    expect(tabs.map((tab) => tab.getAttribute("data-variant"))).toEqual(["wide", "narrow"]);
    expect(screen.getAllByTestId("flow-tab-dots")).toHaveLength(2);
    expect(screen.getAllByTestId("flow-tab-shape")).toHaveLength(2);
  });

  it("keeps a lone tab narrow, like screen 04", () => {
    renderStack(videos(2), [idle(), idle()]);
    expect(screen.getByTestId("flow-tab-next").getAttribute("data-variant")).toBe("narrow");
  });

  it("draws the card with the Figma silhouette and a neutral illustration box without black", () => {
    renderStack([{ kind: "photo", title: "ב", example_url: "/x.png" }], [idle("photo")]);
    expect(screen.getByTestId("flow-card-shape")).toBeTruthy();
    const area = screen.getByTestId("flow-illustration-area");
    expect(getComputedStyle(area).backgroundColor).toBe("rgb(232, 236, 239)");
    expect(getComputedStyle(screen.getByTestId("flow-illustration")).objectFit).toBe("contain");
  });

  it("handles any number of cards: a single card has no tab below", () => {
    renderStack(videos(1), [idle()]);
    expect(screen.getByTestId("flow-card")).toBeTruthy();
    expect(screen.queryByTestId("flow-tab-next")).toBeNull();
  });

  it("handles ten cards without hardcoded titles", () => {
    renderStack(videos(10), Array.from({ length: 10 }, () => idle()));
    expect(screen.getAllByTestId("flow-tab-next")).toHaveLength(9);
  });

  it("lets the employee pick any card: touching a tab swaps it with the active card", () => {
    renderStack(videos(3), [idle(), idle(), idle()]);
    fireEvent.click(screen.getAllByTestId("flow-tab-next")[1]);
    expect((screen.getByTestId("flow-card")).textContent).toContain("וידאו 3");
    expect((screen.getByTestId("flow-card")).getAttribute("data-index")).toBe("2");
  });

  it("folds a sent card above with its send time and a check badge", () => {
    renderStack(videos(3), [sent(), idle(), idle()]);
    const done = screen.getByTestId("flow-tab-done");
    expect((done).textContent).toContain(he.flowTabSent("06:43"));
    expect((within(done).getByTestId("flow-tab-badge")).getAttribute("data-status")).toBe("sent");
    expect((screen.getByTestId("flow-card")).getAttribute("data-index")).toBe("1");
  });

  it("shows the waiting status on a card queued offline", () => {
    renderStack(videos(2), [{ status: "queued", kind: "video" }, idle()]);
    expect((screen.getByTestId("flow-tab-done")).textContent).toContain(he.flowTabWaiting);
  });

  it("renders no active card once everything is handed over", () => {
    renderStack(videos(2), [sent(), sent()]);
    expect(screen.queryByTestId("flow-card")).toBeNull();
    expect(screen.getAllByTestId("flow-tab-done")).toHaveLength(2);
  });

  it("renders nothing without any requirement", () => {
    renderStack([], []);
    expect(screen.queryByTestId("task-card-stack")).toBeNull();
  });

  it("sends the captured file with the card index and the recorded duration", () => {
    const handlers = renderStack(videos(2), [idle(), idle()]);
    fireEvent.click(screen.getByTestId("flow-primary"));
    expect(handlers.onCapture).toHaveBeenCalledWith(0, expect.any(File), "video", 12);
  });

  it("offers the example link only when the menahel configured a guide", () => {
    const withGuide: CompletionRequirement[] = [{ kind: "video", title: "א", example_url: "/e.png" }];
    const handlers = renderStack(withGuide, [idle()]);
    fireEvent.click(screen.getByTestId("flow-guide"));
    expect(handlers.onOpenGuide).toHaveBeenCalledWith(0);
  });

  it("keeps the example link greyed out and inert without a guide", () => {
    const handlers = renderStack(videos(1), [idle()]);
    const link = screen.getByTestId("flow-guide") as HTMLButtonElement;
    expect(link.textContent).toBe(he.flowExampleLink);
    expect(link.disabled).toBe(true);
    fireEvent.click(link);
    expect(handlers.onOpenGuide).not.toHaveBeenCalled();
  });

  it("offers a guide video on its own as an example", () => {
    renderStack([{ kind: "video", min_seconds: 10, guide_video_url: "/how.mp4" }], [idle()]);
    expect((screen.getByTestId("flow-guide") as HTMLButtonElement).disabled).toBe(false);
  });

  it("opens the chat from the single card icon", () => {
    const handlers = renderStack(videos(2), [idle(), idle()]);
    fireEvent.click(screen.getByTestId("flow-card-chat"));
    expect(handlers.onChat).toHaveBeenCalledWith(0);
  });

  it("uses the example image as illustration, with a neutral fallback", () => {
    renderStack([{ kind: "photo", title: "ב", example_url: "/x.png" }], [idle("photo")]);
    expect((screen.getByTestId("flow-illustration")).getAttribute("src")).toBe("/x.png");
  });

  it("falls back to a neutral visual without example", () => {
    renderStack(videos(1), [idle()]);
    expect(screen.getByTestId("flow-illustration-fallback")).toBeTruthy();
  });

  it("sends a message slot with trimmed text, disabled while empty", () => {
    const handlers = renderStack([{ kind: "message", title: "הערה" }], [idle("message")]);
    expect((screen.getByTestId("flow-primary") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(he.flowActionMessage), { target: { value: "  שלום " } });
    fireEvent.click(screen.getByTestId("flow-primary"));
    expect(handlers.onSendText).toHaveBeenCalledWith(0, "שלום");
  });

  it("shows the manager remark on a failed card and only the example link next to the main action", () => {
    const failed: SlotUiState = { status: "failed", kind: "video", error: "שגיאה", remark: "לצלם שוב" };
    renderStack(videos(1), [failed]);
    expect((screen.getByTestId("flow-card-remark")).textContent).toContain("לצלם שוב");
    expect(screen.queryByTestId("flow-retry")).toBeNull();
    expect(screen.getByTestId("flow-guide").textContent).toBe(he.flowExampleLink);
  });
});
