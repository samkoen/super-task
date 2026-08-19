import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EmployeeClaimTaskDialog from "./EmployeeClaimTaskDialog";
import { FeedbackProvider } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import { taskGalleryService } from "../../services/taskGalleryService";

vi.mock("../../services/taskGalleryService", () => ({
  taskGalleryService: {
    listClaimable: vi.fn(),
    claim: vi.fn(),
  },
}));

vi.mock("../../utils/mediaUrl", () => ({
  mediaUrl: (p: string | null) => p,
}));

function renderDialog(onClaimed = vi.fn(), onClose = vi.fn()) {
  render(
    <FeedbackProvider>
      <EmployeeClaimTaskDialog open onClose={onClose} onClaimed={onClaimed} />
    </FeedbackProvider>,
  );
  return { onClaimed, onClose };
}

const RECIPE = {
  id: "g1",
  network_id: "n1",
  branch_id: "b1",
  title: "תיעוד הבסטה אחרי העמסה",
  description: "לצלם אחרי העמסה",
  task_kind: "ad_hoc" as const,
  recurrence: null,
  due_time: null,
  weekly_days: null,
  monthly_day: null,
  photo_required: true,
  reference_photo_url: null,
  reference_video_url: null,
  reference_audio_url: null,
  created_by_id: "m1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

beforeEach(() => {
  vi.mocked(taskGalleryService.listClaimable).mockReset();
  vi.mocked(taskGalleryService.claim).mockReset();
});

describe("EmployeeClaimTaskDialog", () => {
  it("shows empty state when no claimable recipes", async () => {
    vi.mocked(taskGalleryService.listClaimable).mockResolvedValue([]);
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText(he.employeeClaimTaskEmpty)).toBeTruthy();
    });
    expect(taskGalleryService.claim).not.toHaveBeenCalled();
  });

  it("claims immediately when no open copy exists", async () => {
    vi.mocked(taskGalleryService.listClaimable).mockResolvedValue([
      { ...RECIPE, has_open: false },
    ]);
    vi.mocked(taskGalleryService.claim).mockResolvedValue({
      occurrence: { id: "o1" },
      message: he.employeeClaimSuccess,
    });
    const { onClaimed, onClose } = renderDialog();
    await waitFor(() => {
      expect(screen.getByText(RECIPE.title)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(RECIPE.title));
    await waitFor(() => {
      expect(taskGalleryService.claim).toHaveBeenCalledWith("g1");
      expect(onClaimed).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("asks confirmation when an open copy already exists", async () => {
    vi.mocked(taskGalleryService.listClaimable).mockResolvedValue([
      { ...RECIPE, has_open: true },
    ]);
    vi.mocked(taskGalleryService.claim).mockResolvedValue({
      occurrence: { id: "o1" },
      message: he.employeeClaimSuccess,
    });
    renderDialog();
    await waitFor(() => {
      expect(screen.getByText(he.employeeClaimHasOpen)).toBeTruthy();
    });
    fireEvent.click(screen.getByText(RECIPE.title));
    expect(taskGalleryService.claim).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(he.employeeClaimConfirmOpen)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: he.employeeClaimTask }));
    await waitFor(() => {
      expect(taskGalleryService.claim).toHaveBeenCalledWith("g1");
    });
  });
});
