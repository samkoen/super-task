import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CompletionExampleDialog from "./CompletionExampleDialog";

describe("CompletionExampleDialog", () => {
  it("plays a captured video with controls", () => {
    render(
      <CompletionExampleDialog src="blob:oved-video" title="צילום של בסטות" kind="video" onClose={vi.fn()} />,
    );
    const video = document.querySelector("video");
    expect(video?.getAttribute("src")).toBe("blob:oved-video");
    expect(video?.hasAttribute("controls")).toBe(true);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows a photo when the preview is not a video", () => {
    render(<CompletionExampleDialog src="blob:photo" title="תמונה" kind="photo" onClose={vi.fn()} />);
    expect(screen.getByAltText("תמונה").getAttribute("src")).toBe("blob:photo");
    expect(document.querySelector("video")).toBeNull();
  });
});
