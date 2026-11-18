import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import EmployeeUploadBanner from "./EmployeeUploadBanner";
import { he } from "../../i18n/he";

const state = vi.hoisted(() => ({ online: false, count: 0, showSuccess: vi.fn() }));
vi.mock("../../hooks/useOnlineStatus", () => ({ useOnlineStatus: () => state.online }));
vi.mock("../../hooks/usePendingUploads", () => ({ usePendingUploads: () => ({ taskIds: new Set(), taskCount: state.count }) }));
vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => ({ showSuccess: state.showSuccess }) }));

describe("EmployeeUploadBanner", () => {
  beforeEach(() => {
    state.online = false;
    state.count = 0;
    state.showSuccess.mockReset();
  });

  it("shows nothing when nothing waits", () => {
    render(<EmployeeUploadBanner />);
    expect(screen.queryByTestId("employee-upload-banner")).toBeNull();
  });

  it("says there is no reception and how many tasks wait", () => {
    state.count = 2;
    render(<EmployeeUploadBanner />);
    expect(screen.getByTestId("employee-upload-banner").textContent).toContain(he.uploadBannerOffline(2));
    expect(screen.getByText(he.uploadBannerHint)).toBeTruthy();
  });

  it("says it is sending once the network is back, then confirms when all is sent", () => {
    state.online = true;
    state.count = 1;
    const { rerender } = render(<EmployeeUploadBanner />);
    expect(screen.getByTestId("employee-upload-banner").textContent).toContain(he.uploadBannerSending(1));
    state.count = 0;
    rerender(<EmployeeUploadBanner />);
    expect(state.showSuccess).toHaveBeenCalledWith(he.uploadAllSent);
  });
});
