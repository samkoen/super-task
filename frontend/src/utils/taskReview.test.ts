import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { rejectionRemark, reopenNoteError } from "./taskReview";

describe("taskReview", () => {
  it("requires a remark before reopen", () => {
    expect(reopenNoteError("")).toBe(he.taskReopenNoteRequired);
    expect(reopenNoteError("   ")).toBe(he.taskReopenNoteRequired);
    expect(reopenNoteError("תקן את התמונה")).toBe("");
  });

  it("shows the manager remark after a rejected review", () => {
    expect(rejectionRemark(null)).toBeNull();
    expect(rejectionRemark({ manager_review_status: "approved", rejection_note: "x" })).toBeNull();
    expect(
      rejectionRemark({ manager_review_status: "rejected", rejection_note: "תקן את התמונה" }),
    ).toBe("תקן את התמונה");
    expect(rejectionRemark({ manager_review_status: "rejected", rejection_note: "  " })).toBe(
      he.taskRejectedReopen,
    );
  });
});
