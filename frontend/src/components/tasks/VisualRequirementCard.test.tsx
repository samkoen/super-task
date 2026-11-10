import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VisualRequirementCard from "./VisualRequirementCard";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    photoLabel,
    videoLabel,
    onCapture,
  }: {
    photoLabel?: string;
    videoLabel?: string;
    onCapture: (file: File, kind: string) => void;
  }) =>
    videoLabel ? (
      <button type="button" onClick={() => onCapture(new File(["v"], "rec.mp4", { type: "video/mp4" }), "video")}>
        {videoLabel}
      </button>
    ) : (
      <button type="button">{photoLabel}</button>
    ),
}));

let resolvedSrc: string | null = null;

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({
    src: path?.startsWith("blob:") ? path : resolvedSrc,
    loading: false,
    failed: false,
    onError: vi.fn(),
  }),
}));

function renderCard(
  req: CompletionRequirement,
  onExample = vi.fn(),
  guide: { onGuideVideo?: ReturnType<typeof vi.fn>; onGuideVideoClear?: ReturnType<typeof vi.fn> } = {},
) {
  render(
    <VisualRequirementCard
      req={req}
      disabled={false}
      onTitle={vi.fn()}
      onHint={vi.fn()}
      onExample={onExample}
      onGuideVideo={guide.onGuideVideo ?? vi.fn()}
      onGuideVideoClear={guide.onGuideVideoClear ?? vi.fn()}
      onSeconds={vi.fn()}
      onSecondsCommit={vi.fn()}
    />,
  );
  return onExample;
}

function pick(file: File) {
  const input = screen.getByTestId("example-file-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:example"), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  resolvedSrc = null;
  vi.unstubAllGlobals();
});

describe("VisualRequirementCard example buttons", () => {
  it("offers both the camera example and the photo from a file", () => {
    renderCard({ kind: "photo" });
    expect(screen.getByRole("button", { name: he.completionSlotExample })).toBeTruthy();
    expect(screen.getByRole("button", { name: he.completionSlotExampleFromFile })).toBeTruthy();
  });

  it("uses the chosen file as the example image", () => {
    const onExample = renderCard({ kind: "video", min_seconds: 10 });
    const file = new File(["x"], "shelf.jpg", { type: "image/jpeg" });
    pick(file);
    expect(onExample).toHaveBeenCalledWith("blob:example", file);
  });

  it("refuses a file that is not an image", () => {
    const onExample = renderCard({ kind: "photo" });
    pick(new File(["x"], "notes.pdf", { type: "application/pdf" }));
    expect(onExample).not.toHaveBeenCalled();
    expect(screen.getByText(he.referencePhotoFileInvalid)).toBeTruthy();
  });

  it("refuses a video as an example image", () => {
    const onExample = renderCard({ kind: "photo" });
    pick(new File(["x"], "clip.mp4", { type: "video/mp4" }));
    expect(onExample).not.toHaveBeenCalled();
  });

  it("shows the picked file as a preview right away", () => {
    renderCard({ kind: "photo", example_url: "blob:example" });
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("blob:example");
  });

  it("loads a saved example through the authenticated media hook", () => {
    resolvedSrc = "blob:authenticated";
    renderCard({ kind: "photo", example_url: "/uploads/task_photos/a.jpg" });
    expect(screen.getByRole("img").getAttribute("src")).toBe("blob:authenticated");
  });

  it("shows no example buttons for audio or message items", () => {
    renderCard({ kind: "audio" });
    expect(screen.queryByRole("button", { name: he.completionSlotExampleFromFile })).toBeNull();
    expect(screen.queryByRole("button", { name: he.completionGuideVideoPick })).toBeNull();
  });
});

describe("VisualRequirementCard guide video", () => {
  const pickVideo = (file: File) =>
    fireEvent.change(screen.getByTestId("guide-video-input"), { target: { files: [file] } });

  it("lets the manager pick the « איך מצלמים » video", () => {
    const onGuideVideo = vi.fn();
    renderCard({ kind: "video", min_seconds: 10 }, vi.fn(), { onGuideVideo });
    const file = new File(["x"], "how.mp4", { type: "video/mp4" });
    pickVideo(file);
    expect(onGuideVideo).toHaveBeenCalledWith("blob:example", file);
  });

  it("lets the manager film the guide video with the camera", () => {
    const onGuideVideo = vi.fn();
    renderCard({ kind: "photo" }, vi.fn(), { onGuideVideo });
    fireEvent.click(screen.getByRole("button", { name: he.completionGuideVideoCapture }));
    expect(onGuideVideo).toHaveBeenCalledWith("blob:example", expect.any(File));
  });

  it("offers neither pick nor capture for audio or message", () => {
    renderCard({ kind: "message" });
    expect(screen.queryByRole("button", { name: he.completionGuideVideoCapture })).toBeNull();
  });

  it("refuses a file that is not a video", () => {
    const onGuideVideo = vi.fn();
    renderCard({ kind: "photo" }, vi.fn(), { onGuideVideo });
    pickVideo(new File(["x"], "shelf.jpg", { type: "image/jpeg" }));
    expect(onGuideVideo).not.toHaveBeenCalled();
    expect(screen.getByText(he.completionGuideVideoInvalid)).toBeTruthy();
  });

  it("previews the saved video and allows removing it", () => {
    resolvedSrc = "/media/how.mp4";
    const onGuideVideoClear = vi.fn();
    renderCard({ kind: "video", guide_video_url: "/uploads/task_videos/how.mp4" }, vi.fn(), { onGuideVideoClear });
    expect(screen.getByTestId("guide-video-preview")).toBeTruthy();
    expect(screen.getByRole("button", { name: he.completionGuideVideoReplace })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.completionGuideVideoRemove }));
    expect(onGuideVideoClear).toHaveBeenCalled();
  });
});
