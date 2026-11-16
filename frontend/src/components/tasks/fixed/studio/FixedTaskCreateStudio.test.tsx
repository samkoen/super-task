import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import FixedTaskCreateStudio from "./FixedTaskCreateStudio";
import { he } from "../../../../i18n/he";
import type { User } from "../../../../services/api";

vi.mock("../../TaskReferenceMediaEditor", () => ({ default: () => null }));
vi.mock("../../../notifications/NotificationBell", () => ({ default: () => null }));
// La vraie caméra n'existe pas dans jsdom : on garde seulement le déclencheur dessiné par l'appelant.
vi.mock("../../../media/MediaCaptureActions", () => ({
  default: (props: { trigger?: (open: () => void, state: { disabled: boolean }) => ReactNode }) =>
    props.trigger ? <>{props.trigger(() => undefined, { disabled: false })}</> : null,
}));

const employees = [
  { id: "u1", full_name: "אבי כהן", role: "employee", is_active: true, branch_id: "b1" },
  { id: "u2", full_name: "רונית לוי", role: "employee", is_active: true, branch_id: "b1" },
] as unknown as User[];

function renderStudio(onSubmit = vi.fn().mockResolvedValue(undefined), onCancel = vi.fn()) {
  render(
    <FixedTaskCreateStudio
      branches={[]}
      employees={employees}
      canPickBranch={false}
      defaultBranchId="b1"
      currentUserId="m1"
      saving={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />,
  );
  return { onSubmit, onCancel };
}

describe("FixedTaskCreateStudio", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts with an empty stack and explains what is missing", () => {
    renderStudio();
    expect(screen.getByTestId("studio-empty-stack")).toBeTruthy();
    expect(screen.getByTestId("studio-blocker").textContent).toBe(he.fixedWizardNeedContent);
    expect((screen.getByRole("button", { name: he.studioCreate }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("builds a task card by card and sends the same payload as before", async () => {
    const { onSubmit } = renderStudio();
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "פתיחת משמרת" } });
    fireEvent.click(screen.getByRole("button", { name: he.studioAddStep }));
    fireEvent.click(await screen.findByTestId("studio-kind-video"));
    await waitFor(() => expect(screen.getByTestId("studio-card")).toBeTruthy());
    fireEvent.change(screen.getByLabelText(he.studioStepTitleLabel), { target: { value: "סרטון גיבוי" } });
    fireEvent.change(screen.getByLabelText(he.studioStepHintLabel), { target: { value: "צלמו את כל האזור" } });
    fireEvent.click(screen.getByTestId("studio-assignee-u2"));
    fireEvent.click(screen.getByRole("button", { name: he.studioCreate }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe("פתיחת משמרת");
    expect(payload.task_kind).toBe("fixed");
    expect(payload.branch_id).toBe("b1");
    expect(payload.assignee_user_id).toBe("u2");
    expect(payload.completion_requirements).toEqual([
      { kind: "video", min_seconds: 10, title: "סרטון גיבוי", hint: "צלמו את כל האזור" },
    ]);
  });

  it("changes the card type from the black button", async () => {
    renderStudio();
    fireEvent.click(screen.getByRole("button", { name: he.studioAddStep }));
    fireEvent.click(await screen.findByTestId("studio-kind-video"));
    fireEvent.click(await screen.findByTestId("studio-kind-button"));
    fireEvent.click(await screen.findByTestId("studio-kind-message"));
    await waitFor(() => expect(screen.getByTestId("studio-kind-button").textContent).toContain(he.flowActionMessage));
  });

  it("opens the employee preview with the real oved cards", async () => {
    renderStudio();
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "פתיחת משמרת" } });
    fireEvent.click(screen.getByRole("button", { name: he.studioAddStep }));
    fireEvent.click(await screen.findByTestId("studio-kind-photo"));
    fireEvent.click(screen.getByTestId("studio-preview"));
    expect(await screen.findByText(he.studioPreviewBanner)).toBeTruthy();
    expect(screen.getByTestId("task-card-stack")).toBeTruthy();
    expect(screen.getByTestId("task-flow-title").textContent).toBe("פתיחת משמרת");
  });

  it("asks before throwing away a started draft", async () => {
    const { onCancel } = renderStudio();
    fireEvent.change(screen.getByLabelText(he.taskTitle), { target: { value: "טיוטה" } });
    fireEvent.click(screen.getByTestId("studio-back"));
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: he.studioLeaveConfirm }));
    expect(onCancel).toHaveBeenCalled();
  });
});
