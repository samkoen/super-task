import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import type { NewTaskFormSubmitPayload } from "../../components/tasks/NewTaskFormDialog";
import type { WizardForm } from "../../utils/fixedTaskWizard";
import ManagerTaskCreatePage from "./ManagerTaskCreatePage";

const auth = { user: { id: "m1", role: "branch_manager", branch_id: "b1" } };
const submit = vi.fn();
let lastStudio: { initialForm?: Partial<WizardForm>; allowOnce?: boolean; rememberKey?: string } = {};
let createdFrom: string | undefined;

vi.mock("../../context/AuthContext", () => ({ useAuth: () => auth }));
// Fonctions stables comme dans l'app : sinon le chargement (qui en dépend) se relance sans fin.
const feedback = { showError: vi.fn(), showSuccess: vi.fn() };
vi.mock("../../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../../services/userService", () => ({ userService: { listTeam: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../services/branchService", () => ({ branchService: { list: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../hooks/useStudioTaskCreate", () => ({
  useStudioTaskCreate: (onCreated: () => void, galleryId?: string) => {
    createdFrom = galleryId;
    return { saving: false, submit: async (p: NewTaskFormSubmitPayload) => { submit(p); onCreated(); } };
  },
}));
vi.mock("../../components/tasks/TaskGalleryPickerDialog", () => ({
  default: ({ onSelect, onClose }: { onSelect: (item: unknown) => void; onClose: () => void }) => (
    <div data-testid="picker">
      <button onClick={() => onSelect({ id: "g1", title: "תיעוד בסטה", description: "", task_kind: "ad_hoc", completion_requirements: [{ kind: "video" }] })}>pick</button>
      <button onClick={onClose}>close</button>
    </div>
  ),
}));
vi.mock("../../components/tasks/fixed/studio/FixedTaskCreateStudio", () => ({
  default: (props: { initialForm?: Partial<WizardForm>; allowOnce?: boolean; rememberKey?: string; onSubmit: (p: unknown) => Promise<void>; onCancel: () => void }) => {
    lastStudio = props;
    return (
      <div data-testid="studio">
        <button onClick={() => void props.onSubmit({ task_kind: "ad_hoc" })}>create</button>
        <button onClick={props.onCancel}>cancel</button>
      </div>
    );
  },
}));

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

function renderPage(path: string, state?: unknown) {
  const [pathname, search = ""] = path.split("?");
  render(
    <MemoryRouter initialEntries={[{ pathname, search: search ? `?${search}` : "", state }]}>
      <Routes>
        <Route path="/manager/tasks/new" element={<ManagerTaskCreatePage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ManagerTaskCreatePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    submit.mockReset();
    lastStudio = {};
    createdFrom = undefined;
  });

  it("opens the studio on « פעם אחת » and keeps a draft", async () => {
    renderPage("/manager/tasks/new");
    await screen.findByTestId("studio");
    expect(lastStudio.allowOnce).toBe(true);
    expect(lastStudio.initialForm?.taskKind).toBe("ad_hoc");
    expect(lastStudio.rememberKey).toBeTruthy();
  });

  it("returns to the tasks list after creating", async () => {
    renderPage("/manager/tasks/new?branch=b1");
    fireEvent.click(await screen.findByText("create"));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/manager/tasks?branch=b1"));
    expect(submit).toHaveBeenCalled();
  });

  it("asks for a library model first, then fills the studio with it", async () => {
    renderPage("/manager/tasks/new?library=1");
    expect(screen.queryByTestId("studio")).toBeNull();
    fireEvent.click(screen.getByText("pick"));
    await screen.findByTestId("studio");
    expect(lastStudio.initialForm).toMatchObject({ title: "תיעוד בסטה", taskKind: "ad_hoc" });
    expect(lastStudio.initialForm?.completionRequirements).toHaveLength(1);
    expect(lastStudio.rememberKey).toBeUndefined();
    expect(createdFrom).toBe("g1");
  });

  it("goes back to the list when the library is closed", async () => {
    renderPage("/manager/tasks/new?library=1");
    fireEvent.click(screen.getByText("close"));
    expect((await screen.findByTestId("where")).textContent).toBe("/manager/tasks");
  });

  it("fills the studio from an issue report", async () => {
    renderPage("/manager/tasks/new", {
      adHocPrefillFromIssue: {
        branch_id: "b1", title: "נזילה", description: "ליד קופה 3", assignee_user_id: "u1",
        reference_photo_url: "p.jpg", reference_video_url: "", reference_audio_url: "",
      },
    });
    await screen.findByTestId("studio");
    expect(lastStudio.initialForm).toMatchObject({ title: "נזילה", description: "ליד קופה 3", assigneeUserId: "u1", taskKind: "ad_hoc" });
    expect(lastStudio.rememberKey).toBeUndefined();
  });
});
