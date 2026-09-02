import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatMessageMedia from "./ChatMessageMedia";
import { he } from "../../i18n/he";

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null | undefined) => path ?? null,
}));

describe("ChatMessageMedia", () => {
  it("renders received audio as a full-width line without titles or a square player", () => {
    render(<ChatMessageMedia audioUrl="/uploads/voice.webm" />);
    expect(screen.getByTestId("compact-audio-player")).toBeTruthy();
    expect(screen.queryByText(he.completionMediaAdded)).toBeNull();
    expect(screen.queryByText(he.taskReferenceAudio)).toBeNull();
    expect(document.querySelector("audio")).toBeNull();
  });

  it("renders a received photo in the bubble without the attachment tray", () => {
    render(<ChatMessageMedia photoUrl="/uploads/p.jpg" />);
    expect(screen.getByAltText(he.taskReferencePhoto)).toBeTruthy();
    expect(screen.queryByText(he.completionMediaAdded)).toBeNull();
  });
});
