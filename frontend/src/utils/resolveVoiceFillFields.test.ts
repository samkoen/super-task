import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveVoiceFillFields } from "./resolveVoiceFillFields";

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

describe("resolveVoiceFillFields", () => {
  beforeEach(() => {
    generateTaskTitle.mockReset();
  });

  it("keeps AI title and assignee when provided", async () => {
    const out = await resolveVoiceFillFields(
      {
        title: "ניקוי מדף",
        description: "לנקות את מדף החלב",
        assignee_user_id: "u1",
      },
      team,
    );
    expect(out.title).toBe("ניקוי מדף");
    expect(out.description).toBe("לנקות את מדף החלב");
    expect(out.assignee_user_id).toBe("u1");
    expect(generateTaskTitle).not.toHaveBeenCalled();
  });

  it("generates title from description when AI title is empty", async () => {
    generateTaskTitle.mockResolvedValue({ title: "סידור מוצרים" });
    const out = await resolveVoiceFillFields({
      title: "",
      description: "לסדר את המדף ליד הקופה",
      assignee_user_id: "",
    });
    expect(out.title).toBe("סידור מוצרים");
    expect(generateTaskTitle).toHaveBeenCalledWith("לסדר את המדף ליד הקופה");
  });

  it("regenerates title when AI returns generic kind label משימה מזדמנת", async () => {
    generateTaskTitle.mockResolvedValue({ title: "ניקוי מדף חלב" });
    const out = await resolveVoiceFillFields({
      title: "משימה מזדמנת",
      description: "צריך לנקות את מדף החלב",
      assignee_user_id: "u1",
    }, team);
    expect(out.title).toBe("ניקוי מדף חלב");
    expect(generateTaskTitle).toHaveBeenCalledWith("צריך לנקות את מדף החלב");
  });

  it("fills assignee from spoken name in description when id missing", async () => {
    generateTaskTitle.mockResolvedValue({ title: "ניקוי" });
    const out = await resolveVoiceFillFields(
      {
        title: "ניקוי",
        description: "תן ליוסי לנקות את המדף",
        assignee_user_id: "",
        assignee_name: "",
      },
      team,
    );
    expect(out.assignee_user_id).toBe("u1");
  });

  it("fills assignee from assignee_name when id missing", async () => {
    const out = await resolveVoiceFillFields(
      {
        title: "סידור",
        description: "לסדר מדף",
        assignee_user_id: "",
        assignee_name: "דנה",
      },
      team,
    );
    expect(out.assignee_user_id).toBe("u2");
  });
});
