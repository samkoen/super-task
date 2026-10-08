import { describe, expect, it } from "vitest";
import {
  DELIVERY_TASK_TYPES,
  linesWithOrigin,
  canSaveDeliveryLines,
  draftToPayload,
  lineCheckCounts,
  lineFacts,
  lineFullyOk,
  lineMeasures,
  lineNoteMissing,
  lineProductLabel,
  showProblemFields,
  suggestOverall,
  type DeliveryLineDraft,
} from "./deliveryNote";

function draft(partial: Partial<DeliveryLineDraft>): DeliveryLineDraft {
  return { arrival: "ok", note: "", photo_url: "", ...partial };
}

describe("delivery note line", () => {
  it("offers the line check and the origin list as teuda task types", () => {
    expect(DELIVERY_TASK_TYPES).toEqual(["line_check", "origin_list"]);
  });

  it("keeps only products that have a country", () => {
    expect(
      linesWithOrigin([
        { product_name: "תפוח נאשי", origin_name: "סין" },
        { product_name: "עגבניה", origin_name: "  " },
        { product_name: "מלפפון", origin_name: null },
      ]),
    ).toEqual([{ product_name: "תפוח נאשי", origin_name: "סין" }]);
  });

  it("shows the origin under the product when Agroline sent one", () => {
    expect(lineProductLabel({ product_name: "תפוח מוזהב יבוא", origin_name: "איטליה" })).toBe(
      "תפוח מוזהב יבוא · איטליה",
    );
    expect(lineProductLabel({ product_name: "עגבניות", origin_name: "  " })).toBe("עגבניות");
  });

  it("shows weight and price beside the quantity", () => {
    const labels = { weight: "משקל", price: "מחיר" };
    expect(lineFacts({ quantity: 1, unit: "קרטון", weight: 9.23, price: 10.5 }, labels)).toBe(
      "1 קרטון · משקל 9.23 · מחיר 10.50",
    );
    expect(lineFacts({ quantity: 2, unit: "יח" }, labels)).toBe("2 יח");
  });

  it("hides the note when the line is ok", () => {
    const ok = draft({});
    expect(lineFullyOk(ok)).toBe(true);
    expect(showProblemFields(ok)).toBe(false);
    expect(draftToPayload("line-1", ok)).toEqual({
      line_id: "line-1",
      arrival: "ok",
      note: null,
      photo_url: null,
    });
  });

  it("keeps one note and an optional photo when there is a problem", () => {
    const problem = draft({ arrival: "problem", note: "רקוב", photo_url: "https://files/a.jpg" });
    expect(showProblemFields(problem)).toBe(true);
    expect(draftToPayload("line-1", problem)).toEqual({
      line_id: "line-1",
      arrival: "problem",
      note: "רקוב",
      photo_url: "https://files/a.jpg",
    });
  });

  it("treats an untouched line as ok and blocks save when the remark is empty", () => {
    const untouched = draft({ arrival: "" });
    const broken = draft({ arrival: "problem", note: "  " });
    expect(lineFullyOk(untouched)).toBe(true);
    expect(draftToPayload("line-1", untouched).arrival).toBe("ok");
    expect(lineNoteMissing(broken)).toBe(true);
    expect(canSaveDeliveryLines([untouched, broken])).toBe(false);
    expect(canSaveDeliveryLines([untouched, draft({ arrival: "problem", note: "רקוב" })])).toBe(true);
    expect(lineCheckCounts([untouched, broken])).toEqual({ ok: 1, problem: 1 });
    expect(lineMeasures({ weight: 9.23, price: 10.5 }, { weight: "משקל", price: "מחיר" })).toBe(
      "משקל 9.23 · מחיר 10.50",
    );
  });

  it("suggests a problem as soon as one line is not ok", () => {
    expect(suggestOverall([{ fully_ok: true }, { fully_ok: false }])).toBe("problem");
    expect(suggestOverall([{ fully_ok: true }, { fully_ok: true }])).toBe("accepted");
  });
});
