import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CompletionMediaPreview from "./CompletionMediaPreview";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useResolvedMediaSrc", () => ({
  useResolvedMediaSrc: (path: string | null) => ({
    src: path,
    loading: false,
    failed: false,
    onError: () => {},
  }),
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null) => path,
}));

describe("CompletionMediaPreview", () => {
  it("renders received audio as a single-line player, not a large square", () => {
    render(
      <CompletionMediaPreview
        audio_path="/uploads/voice.webm"
        transcriptFallback={false}
      />,
    );
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
    expect(screen.getByLabelText(he.chatAudioPlay)).toBeTruthy();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("shows photo, video and leftover audio together", () => {
    render(
      <CompletionMediaPreview
        photo_path="/p.jpg"
        video_path="/v.mp4"
        audio_path="/a.webm"
        requirements={[{ kind: "photo", title: "מדף" }, { kind: "video", min_seconds: 10 }]}
        transcriptFallback={false}
      />,
    );
    expect(screen.getByText(he.completionMediaFromEmployee)).toBeTruthy();
    expect(screen.getByText(he.completionSlotsProgress(2, 2))).toBeTruthy();
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
  });

  it("offers to mark a completion photo for reopen", () => {
    const onMarkPhoto = vi.fn();
    render(
      <CompletionMediaPreview
        photo_path="/p.jpg"
        onMarkPhoto={onMarkPhoto}
        markedPhotoUrls={["/p.jpg"]}
        transcriptFallback={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.reviewPhotoMarked }));
    expect(onMarkPhoto).toHaveBeenCalledWith("/p.jpg");
  });

  it("hides the mark action when the manager is not reviewing", () => {
    render(<CompletionMediaPreview photo_path="/p.jpg" transcriptFallback={false} />);
    expect(screen.queryByRole("button", { name: he.reviewMarkPhoto })).toBeNull();
  });
});
