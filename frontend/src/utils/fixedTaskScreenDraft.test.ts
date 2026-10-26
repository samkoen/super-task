import { describe, expect, it, beforeEach } from "vitest";
import {
  clearFixedTaskCreateDraft,
  readFixedTaskCreateDraft,
  readFixedTaskCreateForm,
  setFixedTaskCreateOpen,
  writeFixedTaskCreateForm,
  type FixedTaskCreateFormDraft,
} from "./fixedTaskScreenDraft";

const KEY = "manager-fixed-tasks";

function form(over: Partial<FixedTaskCreateFormDraft> = {}): FixedTaskCreateFormDraft {
  return {
    taskKind: "fixed",
    branchId: "b1",
    title: "ששש",
    description: "",
    assigneeUserId: "u1",
    dueAt: "",
    recurrence: "weekly",
    dueTime: "09:00",
    weeklyDays: "2",
    monthlyDay: 1,
    opsCategory: "",
    selectedBranchIds: ["b1"],
    completionRequirements: [],
    isWorkStart: false,
    isWorkEnd: false,
    startUrl: "",
    media: { reference_photo_url: "", reference_video_url: "", reference_audio_url: "" },
    ...over,
  };
}

describe("fixedTaskScreenDraft", () => {
  beforeEach(() => {
    clearFixedTaskCreateDraft(KEY);
  });

  it("keeps example photos when the screen draft stays open", () => {
    const file = new File(["img"], "example.jpg", { type: "image/jpeg" });
    writeFixedTaskCreateForm(
      KEY,
      form({
        completionRequirements: [
          { kind: "photo", title: "מדף", example_url: "blob:ex", pending_example: file },
        ],
      }),
    );
    const saved = readFixedTaskCreateForm(KEY);
    expect(saved?.title).toBe("ששש");
    expect(saved?.completionRequirements[0]?.pending_example).toBe(file);
    expect(saved?.completionRequirements[0]?.example_url).toBe("blob:ex");
    expect(readFixedTaskCreateDraft(KEY)?.open).toBe(true);
  });

  it("drops the create draft when the dialog is closed", () => {
    writeFixedTaskCreateForm(KEY, form());
    setFixedTaskCreateOpen(KEY, false);
    expect(readFixedTaskCreateDraft(KEY)).toBeNull();
  });
});
