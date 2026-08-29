import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ChatPhotoCapture from "./ChatPhotoCapture";
import { he } from "../../i18n/he";

vi.mock("../../hooks/useCameraStream", () => ({
  useCameraStream: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    flip: vi.fn(),
    facing: "environment",
    starting: false,
    active: true,
    error: "",
    onVideoRef: vi.fn(),
    videoRef: { current: null },
  }),
}));

vi.mock("../media/CameraFacingPreview", () => ({
  default: () => <div data-testid="camera-preview" />,
}));

describe("ChatPhotoCapture", () => {
  it("offers dual-camera capture", () => {
    render(
      <ChatPhotoCapture open uploading={false} onClose={vi.fn()} onSend={vi.fn()} />,
    );
    expect(screen.getByText(he.chatDualCameras)).toBeTruthy();
    expect(screen.getAllByTestId("camera-preview")).toHaveLength(1);
    fireEvent.click(screen.getByLabelText(he.chatDualCameras));
    expect(screen.getAllByTestId("camera-preview")).toHaveLength(2);
  });
});
