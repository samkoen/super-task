import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyReferenceTranscript } from "./applyReferenceTranscript";

const generateTaskTitle = vi.fn();

vi.mock("../services/aiService", () => ({
  aiService: {
    generateTaskTitle: (...args: unknown[]) => generateTaskTitle(...args),
  },
}));

const team = [
  { id: "u1", full_name: "יוסי כהן" },
  { id: "u2", full_name: "דנה לוי" },
];

describe("applyReferenceTranscript", () => {
  beforeEach(() => {
    generateTaskTitle.mockReset();
  });

  it("appends transcript, generates title, matches oved from text", async () => {
    generateTaskTitle.mockResolvedValue({ title: "ניקוי מדף" });
    const out = await applyReferenceTranscript({
      transcript: "תן ליוסי לנקות את מדף החלב",
      currentTitle: "",
      currentDescription: "",
      currentAssigneeId: "",
      employees: team,
    });
    expect(out.description).toContain("תן ליוסי לנקות את מדף החלב");
    expect(out.title).toBe("ניקוי מדף");
    expect(out.assignee_user_id).toBe("u1");
    expect(out.assigneeMatched).toBe(true);
  });

  it("does not overwrite existing assignee", async () => {
    generateTaskTitle.mockResolvedValue({ title: "x" });
    const out = await applyReferenceTranscript({
      transcript: "תן ליוסי לנקות",
      currentTitle: "כותרת",
      currentDescription: "קיים",
      currentAssigneeId: "u2",
      employees: team,
    });
    expect(out.assignee_user_id).toBe("u2");
    expect(out.assigneeMatched).toBe(false);
  });

  it("respects lockAssignee", async () => {
    generateTaskTitle.mockResolvedValue({ title: "x" });
    const out = await applyReferenceTranscript({
      transcript: "תן ליוסי לנקות",
      currentTitle: "",
      currentDescription: "",
      currentAssigneeId: "",
      employees: team,
      lockAssignee: true,
    });
    expect(out.assignee_user_id).toBe("");
    expect(out.assigneeMatched).toBe(false);
  });
});
