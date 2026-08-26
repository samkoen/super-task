import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ManagerTaskGalleryPage from "./ManagerTaskGalleryPage";
import { he } from "../../i18n/he";
import { taskGalleryService } from "../../services/taskGalleryService";

vi.mock("react-router-dom", () => ({
  useSearchParams: () => [new URLSearchParams()],
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: "m1", role: "branch_manager", branch_id: "b1" } }),
}));

vi.mock("../../context/FeedbackContext", () => ({
  useFeedback: () => ({ showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock("../../services/taskGalleryService", () => ({
  taskGalleryService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../../services/branchService", () => ({
  branchService: { list: vi.fn() },
}));

vi.mock("../../components/tasks/TaskReferenceMediaEditor", () => ({
  default: () => <div data-testid="media-editor" />,
  resolveTaskReferenceMedia: async () => ({}),
}));

vi.mock("../../components/tasks/CompletionRequirementsEditor", () => ({
  default: () => null,
}));

describe("ManagerTaskGalleryPage", () => {
  it("shows the start-url field at the bottom of a new gallery model", async () => {
    vi.mocked(taskGalleryService.list).mockResolvedValue([]);
    render(<ManagerTaskGalleryPage />);
    await waitFor(() => expect(screen.getByText(he.taskGalleryEmpty)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: he.taskGalleryNew }));
    expect(screen.getByLabelText(he.startUrl)).toBeTruthy();
    expect(screen.getByText(he.startUrlHint)).toBeTruthy();
  });
});
