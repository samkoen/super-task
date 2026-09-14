import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
});
