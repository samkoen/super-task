import { describe, expect, it } from "vitest";
import { buildAdHocPrefillFromIssue } from "./issueReportTaskPrefill";
import type { IssueReport } from "../services/issueReportService";

const base: IssueReport = {
  id: "r1",
  reporter_user_id: "emp1",
  reporter_name: "שירה",
  branch_id: "b1",
  branch_name: "ת״א",
  text: "מקרר לא עובד במחלקת חלב",
  photo_url: "/uploads/issue_photos/a.jpg",
  video_url: null,
  audio_url: null,
  created_at: "2026-07-16T10:00:00Z",
};

describe("buildAdHocPrefillFromIssue", () => {
  it("assigns reporter and copies photo", () => {
    const prefill = buildAdHocPrefillFromIssue(base);
    expect(prefill.assignee_user_id).toBe("emp1");
    expect(prefill.branch_id).toBe("b1");
    expect(prefill.reference_photo_url).toBe("/uploads/issue_photos/a.jpg");
    expect(prefill.title).toContain("מקרר");
    expect(prefill.description).toContain("מקרר");
  });

  it("uses default title when text empty", () => {
    const prefill = buildAdHocPrefillFromIssue({ ...base, text: null });
    expect(prefill.title.length).toBeGreaterThan(0);
    expect(prefill.assignee_user_id).toBe("emp1");
  });
});
