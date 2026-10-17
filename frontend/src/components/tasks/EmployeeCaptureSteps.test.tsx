import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import EmployeeCaptureSteps, { type SlotHints } from "./EmployeeCaptureSteps";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";

const guides: Record<string, unknown> = {};

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    allowedKinds,
    onCapture,
    trigger,
    guide,
  }: {
    allowedKinds?: string[];
    onCapture: (file: File, kind: string, meta?: { durationSeconds?: number }) => void;
    trigger?: (open: () => void, state: { disabled: boolean }) => ReactNode;
    guide?: unknown;
  }) => {
    const kind = allowedKinds?.[0] ?? "photo";
    guides[kind] = guide;
    const open = () =>
      onCapture(new File(["x"], `${kind}.bin`), kind, kind === "video" ? { durationSeconds: 12 } : undefined);
    return <>{trigger?.(open, { disabled: false })}</>;
  },
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (path: string | null) => path }));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));
vi.mock("../../hooks/useVideoPoster", () => ({ useVideoPoster: () => null }));

const reqs: CompletionRequirement[] = [
  { kind: "photo", title: "מדף חלב", example_url: "/example.jpg" },
  { kind: "video", title: "קופה", min_seconds: 10 },
  { kind: "message", title: "הערות" },
];

function kept(url: string): PendingMedia {
  return { file: null, previewUrl: "", capturedAt: "", keptUrl: url };
}

const hints = {
  show: vi.fn(),
  speak: vi.fn(),
  speakingId: null,
  loadingId: null,
  dialog: null,
  closeDialog: vi.fn(),
  supported: true,
} as unknown as SlotHints;

function renderSteps(slots: Array<PendingMedia | null>, extra: Partial<Parameters<typeof EmployeeCaptureSteps>[0]> = {}) {
  return render(
    <EmployeeCaptureSteps requirements={reqs} slots={slots} onChange={vi.fn()} hints={hints} {...extra} />,
  );
}

describe("EmployeeCaptureSteps", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:new"),
      revokeObjectURL: vi.fn(),
    });
    for (const key of Object.keys(guides)) delete guides[key];
  });

  it("highlights the first missing step and marks the finished one", () => {
    renderSteps([kept("/a.jpg"), null, null]);
    const steps = screen.getAllByTestId("capture-step");
    expect(steps.map((el) => el.getAttribute("data-state"))).toEqual(["done", "next", "todo"]);
  });

  it("shows only the title on a tile, with no caption under it", () => {
    renderSteps([kept("/a.jpg"), null, null]);
    const steps = screen.getAllByTestId("capture-step");
    expect(within(steps[1]).queryByText(new RegExp(he.captureStepNext))).toBeNull();
    expect(within(steps[0]).queryByText(he.completionSlotDone)).toBeNull();
  });

  it("has no 'what to attach' heading any more", () => {
    renderSteps([null, null, null]);
    expect(screen.queryByText(he.captureStepsTitle)).toBeNull();
  });

  it("gives every photo or video step its own big capture button, retake once filled", () => {
    renderSteps([kept("/a.jpg"), null, null]);
    expect(screen.getByRole("button", { name: he.completionRetake })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.completionTakeVideo })).toBeTruthy();
  });

  it("stores a captured video in the right slot and keeps the others", () => {
    const onChange = vi.fn();
    const first = kept("/a.jpg");
    renderSteps([first, null, null], { onChange });
    fireEvent.click(screen.getByRole("button", { name: he.completionTakeVideo }));
    const next = onChange.mock.calls[0][0] as Array<PendingMedia | null>;
    expect(next[0]).toBe(first);
    expect(next[1]?.file?.name).toBe("video.bin");
    expect(next[1]?.durationSeconds).toBe(12);
  });

  it("passes the manager's title and example image to the camera screen", () => {
    renderSteps([null, null, null]);
    expect(guides.photo).toEqual({ title: "מדף חלב", exampleSrc: "/example.jpg" });
    expect(guides.video).toEqual({ title: "קופה" });
  });

  it("lets the oved type a message step", () => {
    const onChange = vi.fn();
    renderSteps([null, null, null], { onChange });
    fireEvent.change(screen.getByLabelText(he.completionReqMessage), { target: { value: "הכל תקין" } });
    const next = onChange.mock.calls[0][0] as Array<PendingMedia | null>;
    expect(next[2]?.text).toBe("הכל תקין");
  });

  it("marks everything done when all steps are filled", () => {
    const done: PendingMedia = { file: null, previewUrl: "", capturedAt: "", text: "ok" };
    renderSteps([kept("/a.jpg"), kept("/v.mp4"), done]);
    expect(screen.getAllByTestId("capture-step").every((el) => el.getAttribute("data-state") === "done")).toBe(true);
  });

  it("shows the manager's example image behind a step that has one", () => {
    renderSteps([null, null, null]);
    expect(document.querySelector("img[src='/example.jpg']")).toBeTruthy();
  });

  it("offers the read and listen buttons only on steps that have an explanation", () => {
    render(
      <EmployeeCaptureSteps
        requirements={[{ kind: "photo", title: "מדף חלב" }, { kind: "message" }]}
        slots={[null, null]}
        onChange={vi.fn()}
        hints={hints}
      />,
    );
    expect(screen.getAllByLabelText(he.completionShowHint)).toHaveLength(1);
    expect(screen.getAllByLabelText(he.completionListenHint)).toHaveLength(1);
  });

  it("lets the oved ask a question about one specific step", () => {
    const onAsk = vi.fn();
    renderSteps([null, null, null], { onAsk });
    const asks = screen.getAllByLabelText(he.subtaskAsk);
    expect(asks).toHaveLength(3);
    fireEvent.click(asks[1]);
    expect(onAsk).toHaveBeenCalledWith("קופה");
  });

  it("draws the step chat button as a speech bubble, not a question mark", () => {
    renderSteps([null, null, null], { onAsk: vi.fn() });
    for (const ask of screen.getAllByLabelText(he.subtaskAsk)) {
      expect(ask.querySelector("[data-testid='ChatBubbleOutlineRoundedIcon']")).toBeTruthy();
      expect(ask.querySelector("[data-testid='HelpOutlineRoundedIcon']")).toBeNull();
    }
  });

  it("does not show the question button when nobody can answer", () => {
    renderSteps([null, null, null]);
    expect(screen.queryByLabelText(he.subtaskAsk)).toBeNull();
  });

  it("renders nothing when the task has no requirement", () => {
    const { container } = render(
      <EmployeeCaptureSteps requirements={[]} slots={[]} onChange={vi.fn()} hints={hints} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
