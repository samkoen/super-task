import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VisualRequirementCard from "./VisualRequirementCard";
import { he } from "../../i18n/he";
import type { CompletionRequirement } from "../../utils/completionMedia";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({ photoLabel }: { photoLabel?: string }) => <button type="button">{photoLabel}</button>,
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

function renderCard(req: CompletionRequirement, onExample = vi.fn()) {
  render(
    <VisualRequirementCard
      req={req}
      disabled={false}
      onTitle={vi.fn()}
      onHint={vi.fn()}
      onExample={onExample}
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
  });
});
