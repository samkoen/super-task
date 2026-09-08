import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import { apiErrorMessage, humanizeApiError } from "./apiErrorMessage";

describe("apiErrorMessage", () => {
  it("reads a Hebrew error string from the API body", () => {
    expect(humanizeApiError({ error: "יש להתחיל את המשימה לפני הסיום" })).toBe(
      "יש להתחיל את המשימה לפני הסיום",
    );
  });

  it("unwraps CapacitorHttp nested objects instead of [object Object]", () => {
    expect(humanizeApiError({ error: { message: "נדרשת תמונה" } })).toBe("נדרשת תמונה");
    expect(humanizeApiError({ data: { error: "המשימה כבר נסגרה" } })).toBe("המשימה כבר נסגרה");
    expect(humanizeApiError(JSON.stringify({ error: "אין הרשאה" }))).toBe("אין הרשאה");
    expect(humanizeApiError({})).toBe("");
    expect(humanizeApiError("[object Object]")).toBe("");
  });

  it("formats FastAPI validation details", () => {
    expect(
      humanizeApiError({
        detail: [{ loc: ["body", "status"], msg: "Field required" }],
      }),
    ).toBe("status: Field required");
  });

  it("falls back when the payload is not readable", () => {
    expect(apiErrorMessage({ foo: 1 }, he.errorGeneric)).toBe(he.errorGeneric);
    expect(apiErrorMessage(new Error("יש להתחיל את המשימה לפני הסיום"), he.errorGeneric)).toBe(
      "יש להתחיל את המשימה לפני הסיום",
    );
  });
});
