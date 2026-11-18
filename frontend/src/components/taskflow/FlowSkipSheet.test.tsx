import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FlowSkipSheet from "./FlowSkipSheet";
import { he } from "../../i18n/he";

const recorder = {
  supported: true,
  recording: false,
  paused: false,
  blob: null as Blob | null,
  error: "",
  elapsedSeconds: 0,
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  stop: vi.fn(),
  stopAndWait: vi.fn(),
  reset: vi.fn(),
};
vi.mock("../../hooks/useAudioRecorder", () => ({ useAudioRecorder: () => recorder }));

const req = { kind: "video" as const, title: "בסטה" };

function renderSheet(open = true) {
  const handlers = { onClose: vi.fn(), onConfirm: vi.fn() };
  const view = render(<FlowSkipSheet req={open ? req : null} index={2} {...handlers} />);
  return { ...handlers, ...view };
}

beforeEach(() => {
  Object.assign(recorder, { recording: false, error: "", elapsedSeconds: 0, blob: null });
  recorder.start.mockReset().mockResolvedValue(undefined);
  recorder.reset.mockReset();
  recorder.stopAndWait.mockReset().mockResolvedValue(new Blob(["voice"], { type: "audio/webm" }));
  URL.createObjectURL = vi.fn(() => "blob:voice");
  URL.revokeObjectURL = vi.fn();
});

describe("FlowSkipSheet (screen 05ב)", () => {
  it("asks what prevents the filming and names the card", () => {
    renderSheet();
    expect(screen.getByTestId("flow-skip-heading").textContent).toBe(he.flowSkipSheetTitle);
    expect(screen.getByText(he.flowSkipSheetSubtitle("בסטה"))).toBeTruthy();
    const chips = ["area_blocked", "no_stock", "camera_issue", "other"].map((c) => screen.getByTestId(`flow-skip-reason-${c}`).textContent);
    expect(chips).toEqual([he.flowSkipReasonAreaBlocked, he.flowSkipReasonNoStock, he.flowSkipReasonCameraIssue, he.flowSkipReasonOther]);
  });

  it("renders nothing while closed", () => {
    renderSheet(false);
    expect(screen.queryByTestId("flow-skip-heading")).toBeNull();
  });

  it("blocks « דיווח והמשך » until a reason is chosen", () => {
    const { onConfirm } = renderSheet();
    const confirm = screen.getByTestId("flow-skip-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("reports a predefined reason for the right card", async () => {
    const { onConfirm } = renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-reason-no_stock"));
    fireEvent.click(screen.getByTestId("flow-skip-confirm"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(onConfirm).toHaveBeenCalledWith(2, { reasonCode: "no_stock", reasonText: "", audio: null });
  });

  it("sends the written explanation with the reason", async () => {
    const { onConfirm } = renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-reason-area_blocked"));
    fireEvent.change(screen.getByTestId("flow-skip-text"), { target: { value: "סרט סגירה" } });
    fireEvent.click(screen.getByTestId("flow-skip-confirm"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    expect(onConfirm.mock.calls[0][1]).toMatchObject({ reasonCode: "area_blocked", reasonText: "סרט סגירה" });
  });

  it("« אחר » needs a text or a voice explanation, and says so", () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-reason-other"));
    expect((screen.getByTestId("flow-skip-confirm") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("flow-skip-explanation").getAttribute("data-required")).toBe("true");
    expect(screen.getByPlaceholderText(he.flowSkipTextPlaceholderOther)).toBeTruthy();
    expect(screen.getByTestId("flow-skip-other-needs-details").textContent).toBe(he.flowSkipOtherNeedsDetails);
    fireEvent.change(screen.getByTestId("flow-skip-text"), { target: { value: "משהו" } });
    expect((screen.getByTestId("flow-skip-confirm") as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByTestId("flow-skip-other-needs-details")).toBeNull();
  });

  it("does not show the « אחר » warning for a preset reason", () => {
    renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-reason-area_blocked"));
    expect(screen.queryByTestId("flow-skip-other-needs-details")).toBeNull();
  });

  it("starts recording from the mic button", async () => {
    renderSheet();
    await act(async () => {
      fireEvent.click(screen.getByTestId("flow-skip-mic"));
    });
    expect(recorder.start).toHaveBeenCalledTimes(1);
  });

  it("stops the recording and keeps it as the voice explanation, which satisfies « אחר »", async () => {
    const { onConfirm, rerender } = renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-reason-other"));
    recorder.recording = true;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByTestId("flow-skip-recording")).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByTestId("flow-skip-stop"));
    });
    recorder.recording = false;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByTestId("flow-skip-recorded")).toBeTruthy();
    expect(screen.getByPlaceholderText(he.flowSkipTextPlaceholderVoice)).toBeTruthy();
    fireEvent.click(screen.getByTestId("flow-skip-confirm"));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    const draft = onConfirm.mock.calls[0][1];
    expect(draft.reasonCode).toBe("other");
    expect(draft.audio).toBeInstanceOf(File);
    expect(draft.audio.type).toBe("audio/webm");
  });

  it("deletes the recording on request", async () => {
    const { rerender, onConfirm } = renderSheet();
    recorder.recording = true;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("flow-skip-stop"));
    });
    recorder.recording = false;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId("flow-skip-audio-delete"));
    expect(screen.queryByTestId("flow-skip-recorded")).toBeNull();
    expect(recorder.reset).toHaveBeenCalled();
  });

  it("shows the Figma 05ה2 recorder: red stop, live wave and a 0:07 clock", () => {
    recorder.recording = true;
    recorder.elapsedSeconds = 7;
    renderSheet();
    expect(screen.getByTestId("flow-skip-live-wave")).toBeTruthy();
    expect(screen.getByTestId("flow-skip-timer").textContent).toBe("0:07");
    expect(screen.queryByTestId("flow-skip-mic")).toBeNull();
  });

  it("throws away a recording in progress with the X", () => {
    recorder.recording = true;
    renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-audio-delete"));
    expect(recorder.reset).toHaveBeenCalled();
  });

  it("replays the recording before sending (05ה3): « 0:00 / 0:14 » and a play button", async () => {
    const { rerender, onConfirm } = renderSheet();
    recorder.recording = true;
    recorder.elapsedSeconds = 14;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    await act(async () => {
      fireEvent.click(screen.getByTestId("flow-skip-stop"));
    });
    recorder.recording = false;
    rerender(<FlowSkipSheet req={req} index={2} onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByTestId("flow-skip-timer").textContent).toBe("0:00 / 0:14");
    const audio = screen.getByTestId("flow-skip-audio") as HTMLAudioElement;
    const play = vi.spyOn(audio, "play").mockResolvedValue(undefined);
    fireEvent.click(screen.getByTestId("flow-skip-play"));
    expect(play).toHaveBeenCalled();
    fireEvent.play(audio);
    expect(screen.getByTestId("flow-skip-play").getAttribute("aria-label")).toBe(he.flowSkipPause);
  });

  it("tells the worker when the device cannot record", () => {
    recorder.error = "permission";
    renderSheet();
    expect(screen.getByTestId("flow-skip-record-error").textContent).toBe(he.flowSkipRecordFailed);
  });

  it("« אצלם אחר כך » and the X close the sheet without reporting anything", () => {
    const { onClose, onConfirm } = renderSheet();
    fireEvent.click(screen.getByTestId("flow-skip-later"));
    fireEvent.click(screen.getByTestId("flow-skip-x"));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("stops the microphone when the sheet goes away", () => {
    const { unmount } = renderSheet();
    unmount();
    expect(recorder.reset).toHaveBeenCalled();
  });
});
