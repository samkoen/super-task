import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionExampleDialog from "./CompletionExampleDialog";
import { he } from "../../i18n/he";

describe("CompletionExampleDialog", () => {
  it("plays a captured video with controls", () => {
    render(
      <CompletionExampleDialog src="blob:oved-video" title="צילום של בסטות" kind="video" onClose={vi.fn()} />,
    );
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toBe("blob:oved-video");
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.queryByRole("button", { name: he.reviewMarkVideoFrame })).toBeNull();
  });

  it("offers to circle the paused frame while reviewing", () => {
    render(
      <CompletionExampleDialog
        src="blob:oved-video"
        title="סיום משמרת"
        kind="video"
        onClose={vi.fn()}
        onMarkFrame={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: he.reviewMarkVideoFrame })).toBeTruthy();
    expect(screen.getByText(he.reviewMarkVideoHint)).toBeTruthy();
  });

  it("shows a photo when the preview is not a video", () => {
    render(<CompletionExampleDialog src="blob:photo" title="תמונה" kind="photo" onClose={vi.fn()} />);
    expect(screen.getByAltText("תמונה").getAttribute("src")).toBe("blob:photo");
    expect(document.querySelector("video")).toBeNull();
  });
});
