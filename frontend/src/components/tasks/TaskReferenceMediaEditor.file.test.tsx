import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TaskReferenceMediaEditor from "./TaskReferenceMediaEditor";
import { he } from "../../i18n/he";

vi.mock("../media/MediaCaptureActions", () => ({
  default: () => <div>capture</div>,
}));

vi.mock("../../services/taskService", () => ({
  taskService: {
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
  },
}));

vi.mock("../../services/aiService", () => ({
  aiService: { transcribeReferenceAudio: vi.fn() },
}));

const empty = {
  reference_photo_url: "",
  reference_video_url: "",
  reference_audio_url: "",
};

describe("TaskReferenceMediaEditor file pick", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("keeps a photo chosen from a file until the form is saved", () => {
    const onChange = vi.fn();
    render(<TaskReferenceMediaEditor value={empty} onChange={onChange} />);
    const file = new File(["x"], "shelf.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ pending_photo: file, reference_photo_url: "blob:mock" }),
    );
    expect(screen.getByRole("button", { name: he.addReferenceFromFile })).toBeTruthy();
  });

  it("rejects a file that is not a photo or a video", () => {
    const onError = vi.fn();
    render(<TaskReferenceMediaEditor value={empty} onChange={vi.fn()} onError={onError} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "note.pdf", { type: "application/pdf" })] },
    });
    expect(onError).toHaveBeenCalledWith(he.referenceFileInvalid);
  });
});
