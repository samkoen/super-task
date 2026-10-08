import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import EmployeeCaptureSteps from "./EmployeeCaptureSteps";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";
import type { PendingMedia } from "../../utils/pendingMedia";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    allowedKinds,
    photoAdded,
    videoAdded,
    audioAdded,
    onCapture,
  }: {
    allowedKinds?: string[];
    photoAdded?: boolean;
    videoAdded?: boolean;
    audioAdded?: boolean;
    onCapture: (file: File, kind: string, meta?: { durationSeconds?: number }) => void;
  }) => {
    const kind = allowedKinds?.[0] ?? "photo";
    const added = kind === "video" ? videoAdded : kind === "audio" ? audioAdded : photoAdded;
    return (
      <button
        type="button"
        onClick={() => onCapture(new File(["x"], `${kind}.bin`), kind, kind === "video" ? { durationSeconds: 12 } : undefined)}
      >
        {added ? `retake-${kind}` : `take-${kind}`}
      </button>
    );
  },
}));

vi.mock("../../utils/mediaUrl", () => ({ mediaUrl: (path: string | null) => path }));
vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({ src: path, loading: false, failed: false, onError: () => {} }),
}));
vi.mock("../../hooks/useVideoPoster", () => ({ useVideoPoster: () => null }));
vi.mock("../../services/aiService", () => ({
  aiService: {
    getStatus: vi.fn(async () => ({ tts_available: false })),
    translateText: vi.fn(async (text: string) => text),
  },
}));

const reqs: CompletionRequirement[] = [
  { kind: "photo", title: "מדף חלב", example_url: "/example.jpg" },
  { kind: "video", title: "קופה", min_seconds: 10 },
  { kind: "message", title: "הערות" },
];

function kept(url: string): PendingMedia {
  return { file: null, previewUrl: "", capturedAt: "", keptUrl: url };
}

describe("EmployeeCaptureSteps", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:new"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("shows overall progress and highlights the first missing step", () => {
    render(<EmployeeCaptureSteps requirements={reqs} slots={[kept("/a.jpg"), null, null]} onChange={vi.fn()} />);
    expect(screen.getByText(he.completionSlotsProgress(1, 3))).toBeTruthy();
    const steps = screen.getAllByTestId("capture-step");
    expect(steps.map((el) => el.getAttribute("data-state"))).toEqual(["done", "next", "todo"]);
    expect(within(steps[1]).getByText(new RegExp(he.captureStepNext))).toBeTruthy();
  });

  it("gives every requirement its own big capture button, retake once filled", () => {
    render(<EmployeeCaptureSteps requirements={reqs} slots={[kept("/a.jpg"), null, null]} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "retake-photo" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "take-video" })).toBeTruthy();
  });

  it("stores a captured photo in the right slot and keeps the others", () => {
    const onChange = vi.fn();
    const first = kept("/a.jpg");
    render(<EmployeeCaptureSteps requirements={reqs} slots={[first, null, null]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "take-video" }));
    const next = onChange.mock.calls[0][0] as Array<PendingMedia | null>;
    expect(next[0]).toBe(first);
    expect(next[1]?.file?.name).toBe("video.bin");
    expect(next[1]?.durationSeconds).toBe(12);
  });

  it("lets the oved type a message step", () => {
    const onChange = vi.fn();
    render(<EmployeeCaptureSteps requirements={reqs} slots={[null, null, null]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(he.completionReqMessage), { target: { value: "הכל תקין" } });
    const next = onChange.mock.calls[0][0] as Array<PendingMedia | null>;
    expect(next[2]?.text).toBe("הכל תקין");
  });

  it("marks everything done and turns the bar green when all steps are filled", () => {
    const done: PendingMedia = { file: null, previewUrl: "", capturedAt: "", text: "ok" };
    render(
      <EmployeeCaptureSteps requirements={reqs} slots={[kept("/a.jpg"), kept("/v.mp4"), done]} onChange={vi.fn()} />,
    );
    expect(screen.getByText(he.completionSlotsProgress(3, 3))).toBeTruthy();
    expect(screen.getAllByTestId("capture-step").every((el) => el.getAttribute("data-state") === "done")).toBe(true);
  });

  it("opens the example full size when it is tapped", () => {
    render(<EmployeeCaptureSteps requirements={reqs} slots={[null, null, null]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: he.completionEnlargeExample }));
    expect(document.querySelectorAll("img[src='/example.jpg']").length).toBeGreaterThan(1);
  });

  it("offers the hint and listen buttons only on steps that have an explanation", () => {
    render(
      <EmployeeCaptureSteps
        requirements={[{ kind: "photo", title: "מדף חלב" }, { kind: "message" }]}
        slots={[null, null]}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getAllByLabelText(he.completionShowHint)).toHaveLength(1);
  });

  it("renders nothing when the task has no requirement", () => {
    const { container } = render(<EmployeeCaptureSteps requirements={[]} slots={[]} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
