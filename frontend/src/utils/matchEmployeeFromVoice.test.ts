import { describe, expect, it } from "vitest";
import { matchEmployeeIdByName, matchEmployeeIdInText } from "./matchEmployeeFromVoice";

const team = [
  { id: "u1", full_name: "יוסי כהן" },
  { id: "u2", full_name: "דנה לוי" },
];

describe("matchEmployeeFromVoice", () => {
  it("matches by first name", () => {
    expect(matchEmployeeIdByName("יוסי", team)).toBe("u1");
  });

  it("finds name inside spoken description", () => {
    expect(matchEmployeeIdInText("תן ליוסי לנקות את המדף", team)).toBe("u1");
  });

  it("returns null when ambiguous first names", () => {
    const amb = [
      { id: "a", full_name: "דני כהן" },
      { id: "b", full_name: "דני לוי" },
    ];
    expect(matchEmployeeIdInText("תן לדני את המשימה", amb)).toBeNull();
  });
});
