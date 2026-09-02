import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SystemBugDialog, { resolveSystemBugScreenshot } from "./SystemBugDialog";
import { he } from "../../i18n/he";
import { submitSystemBug } from "../../services/systemBugService";

vi.mock("../../services/systemBugService", () => ({
  submitSystemBug: vi.fn(),
}));

vi.mock("../../hooks/useAudioRecorder", () => ({
  useAudioRecorder: () => ({
    supported: true,
    recording: false,
    blob: null,
    error: "",
    start: vi.fn(),
    stop: vi.fn(),
    stopAndWait: vi.fn().mockResolvedValue(null),
    reset: vi.fn(),
  }),
}));

vi.mock("../media/PhotoAnnotationCanvas", async () => {
  const { forwardRef } = await import("react");
  const { he: labels } = await import("../../i18n/he");
  return {
    default: forwardRef(function MockPhotoAnnotationCanvas(_props, _ref) {
      return (
        <div>
          <button type="button" aria-label={labels.photoAnnotateEllipse} />
          <button type="button" aria-label={labels.photoAnnotateArrow} />
        </div>
      );
    }),
  };
});

describe("SystemBugDialog", () => {
  it("requires text or audio before send", async () => {
    const onError = vi.fn();
    render(
      <SystemBugDialog
        open
        screenshot={null}
        route="/employee"
        trail={["/employee"]}
        appVersion="0.1.0"
        preview=""
        branchName="שפע"
        onClose={vi.fn()}
        onSent={vi.fn()}
        onError={onError}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: he.systemBugSend }));
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(he.systemBugNeedExplain);
    });
    expect(submitSystemBug).not.toHaveBeenCalled();
  });

  it("sends a written report", async () => {
    vi.mocked(submitSystemBug).mockResolvedValue();
    const onSent = vi.fn();
    render(
      <SystemBugDialog
        open
        screenshot={null}
        route="/employee"
        trail={["/employee"]}
        appVersion="0.1.0"
        preview=""
        branchName=""
        onClose={vi.fn()}
        onSent={onSent}
        onError={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText(he.systemBugNote), { target: { value: "נפל" } });
    fireEvent.click(screen.getByRole("button", { name: he.systemBugSend }));
    await waitFor(() => {
      expect(submitSystemBug).toHaveBeenCalled();
      expect(onSent).toHaveBeenCalled();
    });
  });

  it("offers ellipse and arrow tools on the screenshot", () => {
    render(
      <SystemBugDialog
        open
        screenshot={new Blob(["png"], { type: "image/png" })}
        route="/employee"
        trail={["/employee"]}
        appVersion="0.1.0"
        preview=""
        branchName=""
        onClose={vi.fn()}
        onSent={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(he.photoAnnotateEllipse)).toBeTruthy();
    expect(screen.getByLabelText(he.photoAnnotateArrow)).toBeTruthy();
  });

  it("sends the annotated screenshot when export succeeds", async () => {
    const original = new Blob(["raw"], { type: "image/png" });
    const marked = new File(["marked"], "shot.jpg", { type: "image/jpeg" });
    const result = await resolveSystemBugScreenshot(original, {
      exportFile: async () => marked,
    });
    expect(result).toBe(marked);
  });

  it("keeps the original screenshot if annotation export fails", async () => {
    const original = new Blob(["raw"], { type: "image/png" });
    const result = await resolveSystemBugScreenshot(original, {
      exportFile: async () => {
        throw new Error("canvas not ready");
      },
    });
    expect(result).toBe(original);
  });
});
