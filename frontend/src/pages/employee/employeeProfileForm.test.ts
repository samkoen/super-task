import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { employeeProfileFormFromUser } from "./employeeProfileForm";

describe("employeeProfileFormFromUser", () => {
  it("copies language and phone from the oved", () => {
    const form = employeeProfileFormFromUser({
      first_name: "דנה",
      last_name: "לוי",
      email: "dana@test.com",
      phone: "050",
      preferred_language: "th",
    });
    expect(form.preferred_language).toBe("th");
    expect(form.phone).toBe("050");
  });

  it("defaults language to Hebrew when missing", () => {
    const form = employeeProfileFormFromUser({
      first_name: "א",
      last_name: "ב",
      email: "a@test.com",
      phone: null,
    });
    expect(form.preferred_language).toBe("he");
    expect(form.phone).toBe("");
  });
});

describe("employee account route", () => {
  it("is registered for the oved", () => {
    const src = readFileSync(resolve(__dirname, "../../App.tsx"), "utf8");
    expect(src).toContain('path="/employee/account"');
    expect(src).toContain("EmployeeProfilePage");
  });

  it("appears in the oved menu", () => {
    const src = readFileSync(resolve(__dirname, "../../components/Layout/Layout.tsx"), "utf8");
    expect(src).toContain('path: "/employee/account"');
    expect(src).toContain("navigate(\"/employee/account\")");
  });
});
