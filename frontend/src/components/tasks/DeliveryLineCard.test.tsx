import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeliveryLineCard from "./DeliveryLineCard";
import { taskService } from "../../services/taskService";
import { launchPhotoCapture } from "../../utils/launchPhotoCapture";
import { he } from "../../i18n/he";
import type { DeliveryLineDraft, DeliveryLineView } from "../../utils/deliveryNote";

vi.mock("../../services/taskService", () => ({
  taskService: { uploadPhoto: vi.fn(), uploadAudio: vi.fn() },
}));
vi.mock("../../hooks/useCameraStream", () => ({
  useCameraStream: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    supported: true,
    active: true,
    starting: false,
    error: "",
    facing: "environment",
    onVideoRef: vi.fn(),
    flip: vi.fn(),
    videoRef: { current: null },
  }),
}));
vi.mock("../../utils/launchPhotoCapture", () => ({
  launchPhotoCapture: vi.fn(async (options: { openWeb: () => void }) => {
    options.openWeb();
  }),
}));
vi.mock("../media/AudioCaptureDialog", () => ({
  default: ({
    open,
    onCapture,
  }: {
    open: boolean;
    onCapture: (file: File) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onCapture(new File(["a"], "a.webm", { type: "audio/webm" }))}>
        confirm-audio
      </button>
    ) : null,
}));
vi.mock("../media/MediaCaptureActions", () => ({
  PhotoCaptureDialog: ({
    open,
    onCapture,
  }: {
    open: boolean;
    onCapture: (file: File) => void;
  }) =>
    open ? (
      <button type="button" onClick={() => onCapture(new File(["x"], "shot.jpg", { type: "image/jpeg" }))}>
        confirm-camera
      </button>
    ) : null,
}));

const line: DeliveryLineView = {
  id: "l1",
  position: 1,
  product_name: "מלפפון",
  quantity: 3,
  unit: "קרטון",
  image_url: null,
};
const problem: DeliveryLineDraft = { arrival: "problem", note: "", photo_url: "", audio_url: "" };

function setup(draft: DeliveryLineDraft) {
  const onChange = vi.fn();
  const onError = vi.fn();
  render(<DeliveryLineCard line={line} draft={draft} disabled={false} onChange={onChange} onError={onError} />);
  return { onChange, onError };
}

describe("DeliveryLineCard", () => {
  beforeEach(() => {
    vi.mocked(taskService.uploadPhoto).mockReset();
    vi.mocked(taskService.uploadAudio).mockReset();
    vi.mocked(launchPhotoCapture).mockClear();
  });

  it("hides the remark field while the line is OK", () => {
    setup({ arrival: "ok", note: "", photo_url: "", audio_url: "" });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("asks for a remark when the line is not OK and empty", () => {
    setup(problem);
    expect(screen.getByText(he.deliveryNoteNoteMissingHint)).toBeTruthy();
  });

  it("opens the camera and stores the shot, without a file picker", async () => {
    vi.mocked(taskService.uploadPhoto).mockResolvedValue({ url: "/u/1.jpg" } as never);
    const { onChange } = setup(problem);
    expect(document.querySelector("input[type=file]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: he.deliveryNoteLinePhoto }));
    expect(launchPhotoCapture).toHaveBeenCalledTimes(1);
    fireEvent.click(await screen.findByRole("button", { name: "confirm-camera" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...problem, photo_url: "/u/1.jpg" }));
    expect(document.querySelector("input[type=file]")).toBeNull();
  });

  it("records audio onto a not-ok line", async () => {
    vi.mocked(taskService.uploadAudio).mockResolvedValue({ url: "/u/a.webm" } as never);
    const { onChange } = setup(problem);
    fireEvent.click(screen.getByRole("button", { name: he.deliveryNoteLineAudio }));
    fireEvent.click(await screen.findByRole("button", { name: "confirm-audio" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...problem, audio_url: "/u/a.webm" }));
  });

  it("reports an error when the photo upload fails", async () => {
    vi.mocked(taskService.uploadPhoto).mockImplementation(async () => {
      throw new Error("x");
    });
    const { onChange, onError } = setup(problem);
    fireEvent.click(screen.getByRole("button", { name: he.deliveryNoteLinePhoto }));
    fireEvent.click(await screen.findByRole("button", { name: "confirm-camera" }));
    await waitFor(() => expect(onError).toHaveBeenCalledWith(he.errorGeneric));
    expect(onChange).not.toHaveBeenCalled();
  });
});
