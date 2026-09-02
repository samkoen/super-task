import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SystemBugDialog from "./SystemBugDialog";
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
});
