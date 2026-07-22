import { describe, expect, it } from "vitest";
import { employeeCardToOccurrence, showsHebrewTitle } from "./employeeTaskCard";
import type { EmployeeTaskCard } from "../services/dashboardService";

const baseCard: EmployeeTaskCard = {
  id: "t1",
  title: "Clean",
  description: "desc",
  due_at: "2026-07-22T10:00:00Z",
  created_at: "2026-07-21T10:00:00Z",
  status: "pending",
  task_kind: "fixed",
  photo_required: true,
  department_name: null,
  started_at: null,
};

describe("employeeCardToOccurrence", () => {
  it("maps dashboard card to shared TaskOccurrence shape", () => {
    const occ = employeeCardToOccurrence({
      ...baseCard,
      title_he: "ניקיון",
      display_language: "en",
      spoken_text: "hello",
    });
    expect(occ.id).toBe("t1");
    expect(occ.title).toBe("Clean");
    expect(occ.title_he).toBe("ניקיון");
    expect(occ.spoken_text).toBe("hello");
    expect(occ.reference_photo_url).toBeUndefined();
  });
});

describe("showsHebrewTitle", () => {
  it("shows when translated away from hebrew", () => {
    expect(
      showsHebrewTitle({ title: "Clean", title_he: "ניקיון", display_language: "en" }),
    ).toBe(true);
  });

  it("hides when already hebrew", () => {
    expect(
      showsHebrewTitle({ title: "ניקיון", title_he: "ניקיון", display_language: "he" }),
    ).toBe(false);
  });
});
