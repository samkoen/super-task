import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionMediaPreview from "./CompletionMediaPreview";
import { he } from "../../i18n/he";

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
});
