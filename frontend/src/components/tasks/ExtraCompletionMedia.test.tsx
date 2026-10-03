import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ExtraCompletionMedia from "./ExtraCompletionMedia";
import { he } from "../../i18n/he";
import type { ExtraSlot } from "../../utils/extraCompletionMedia";

vi.mock("../media/MediaCaptureActions", () => ({
  default: ({
    disabled,
    onCapture,
  }: {
    disabled?: boolean;
    onCapture: (file: File, kind: "photo" | "video" | "audio", meta?: { durationSeconds?: number }) => void;
  }) => (
    <div>
      <button type="button" disabled={disabled} onClick={() => onCapture(new File(["a"], "a.jpg"), "photo")}>
        {he.addPhoto}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onCapture(new File(["v"], "v.webm"), "video", { durationSeconds: 4 })}
      >
        {he.addVideo}
      </button>
      <button type="button" disabled={disabled} onClick={() => onCapture(new File(["s"], "s.webm"), "audio")}>
        {he.addAudio}
      </button>
    </div>
  ),
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (path: string | null) => path,
}));

describe("ExtraCompletionMedia", () => {
  beforeEach(() => {
    let seq = 0;
    vi.stubGlobal(
      "URL",
      class {
        static createObjectURL = vi.fn(() => `blob:extra-${++seq}`);
        static revokeObjectURL = vi.fn();
      },
    );
  });

  it("adds an optional photo without touching required slots", () => {
    const onChange = vi.fn();
    render(<ExtraCompletionMedia extras={[]} onChange={onChange} />);
    expect(screen.getByText(he.extraCompletionHint)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.addPhoto }));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0][0] as ExtraSlot[];
    expect(next).toHaveLength(1);
    expect(next[0]?.kind).toBe("photo");
    expect(next[0]?.media.file?.name).toBe("a.jpg");
  });

  it("removes an extra video the oved already added", () => {
    const onChange = vi.fn();
    const extras: ExtraSlot[] = [
      {
        kind: "video",
        media: {
          file: null,
          previewUrl: "",
          capturedAt: "",
          keptUrl: "/extra.mp4",
          durationSeconds: 4,
        },
      },
    ];
    render(<ExtraCompletionMedia extras={extras} onChange={onChange} />);
    expect(document.querySelector("video[src='/extra.mp4']")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: he.removeMedia }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
