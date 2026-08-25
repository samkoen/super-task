import { describe, expect, it, vi, beforeEach } from "vitest";
import { taskGalleryService } from "../../services/taskGalleryService";
import { taskService } from "../../services/taskService";
import { ASSIGN_TO_GALLERY } from "../../constants/taskAssignment";
import { he } from "../../i18n/he";
import {
  emptyOccurrenceEditForm,
  formFromOccurrence,
  saveOccurrenceEdit,
} from "./taskOccurrenceEditForm";

vi.mock("../../services/taskService", () => ({
  taskService: {
    updateOccurrence: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("../../services/taskGalleryService", () => ({
  taskGalleryService: {
    createFromOccurrence: vi.fn(),
  },
}));

vi.mock("./TaskReferenceMediaEditor", () => ({
  resolveTaskReferenceMedia: vi.fn(async (v: { reference_photo_url: string }) => ({
    reference_photo_url: v.reference_photo_url || null,
    reference_video_url: null,
    reference_audio_url: null,
  })),
}));

const baseTarget = {
  id: "occ-1",
  title: "Task",
  description: "Desc",
  due_at: "2026-07-25T07:30:00+03:00",
  assignee_user_id: "u1",
  photo_required: true,
  task_kind: "ad_hoc" as const,
  reference_photo_url: null,
  reference_video_url: null,
  reference_audio_url: null,
  branch_id: "b1",
};

describe("taskOccurrenceEditForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(taskService.updateOccurrence).mockResolvedValue({
      message: he.taskUpdated,
      occurrence: baseTarget as never,
      updated_count: 1,
    });
  });

  it("maps occurrence into edit form", () => {
    const form = formFromOccurrence({
      ...baseTarget,
      status: "pending",
      created_at: "2026-07-25T05:00:00+03:00",
    } as never);
    expect(form.title).toBe("Task");
    expect(form.assignee_user_id).toBe("u1");
    expect(form.due_at).toContain("2026-07-25");
    expect(form.start_url).toBe("");
  });

  it("maps start_url into the edit form", () => {
    const form = formFromOccurrence({
      ...baseTarget,
      start_url: "https://my.agroline.co.il/x",
      status: "pending",
      created_at: "2026-07-25T05:00:00+03:00",
    } as never);
    expect(form.start_url).toBe("https://my.agroline.co.il/x");
  });

  it("saves nominal update", async () => {
    const form = {
      ...emptyOccurrenceEditForm(),
      title: "Updated",
      due_at: "2026-07-25T10:00",
      assignee_user_id: "u2",
      photo_required: false,
    };
    const msg = await saveOccurrenceEdit(baseTarget as never, form, false);
    expect(msg).toBe(he.taskUpdated);
    expect(taskService.updateOccurrence).toHaveBeenCalledWith(
      "occ-1",
      expect.objectContaining({
        title: "Updated",
        assignee_user_id: "u2",
        apply_to_network: false,
        start_url: null,
      }),
    );
    expect(taskGalleryService.createFromOccurrence).not.toHaveBeenCalled();
  });

  it("saves the start url", async () => {
    const url = "https://my.agroline.co.il/main/azmanot/client-orders/create";
    const form = {
      ...emptyOccurrenceEditForm(),
      title: "Updated",
      due_at: "2026-07-25T10:00",
      assignee_user_id: "u2",
      start_url: url,
    };
    await saveOccurrenceEdit(baseTarget as never, form, false);
    expect(taskService.updateOccurrence).toHaveBeenCalledWith(
      "occ-1",
      expect.objectContaining({ start_url: url }),
    );
  });

  it("moves to gallery when assignee is gallery sentinel", async () => {
    const form = {
      ...emptyOccurrenceEditForm(),
      title: "Keep",
      due_at: "2026-07-25T10:00",
      assignee_user_id: ASSIGN_TO_GALLERY,
    };
    const msg = await saveOccurrenceEdit(baseTarget as never, form, false);
    expect(msg).toBe(he.taskMovedToGallery);
    expect(taskGalleryService.createFromOccurrence).toHaveBeenCalledWith("occ-1");
    expect(taskService.cancel).toHaveBeenCalledWith("occ-1");
  });

  it("sends apply_to_network when editing the whole group", async () => {
    vi.mocked(taskService.updateOccurrence).mockResolvedValue({
      message: "ok",
      occurrence: baseTarget as never,
      updated_count: 3,
    });
    const form = {
      ...emptyOccurrenceEditForm(),
      title: "Updated",
      due_at: "2026-07-25T10:00",
      assignee_user_id: "u2",
      apply_to_network: true,
    };
    const msg = await saveOccurrenceEdit(baseTarget as never, form, false);
    expect(msg).toBe(he.managerAdHocSavedNetwork(3));
    expect(taskService.updateOccurrence).toHaveBeenCalledWith(
      "occ-1",
      expect.objectContaining({ apply_to_network: true }),
    );
  });
});
