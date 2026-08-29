import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import EmployeeAvatarCapture from "./EmployeeAvatarCapture";
import { useCameraStream } from "../../hooks/useCameraStream";

vi.mock("../media/MediaCaptureActions", () => ({
  PhotoCaptureDialog: () => <div>photo-dialog</div>,
}));

vi.mock("./AvatarCropDialog", () => ({
  default: () => <div>crop-dialog</div>,
}));

vi.mock("../../hooks/useCameraStream", () => ({
  useCameraStream: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe("EmployeeAvatarCapture", () => {
  it("opens the selfie camera by default", () => {
    render(
      <EmployeeAvatarCapture open uploading={false} onClose={() => undefined} onCapture={async () => undefined} />,
    );
    expect(useCameraStream).toHaveBeenCalledWith({ defaultFacing: "user" });
  });
});
