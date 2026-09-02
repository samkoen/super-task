import { describe, expect, it } from "vitest";
import { pickSystemBugPortalHost } from "./systemBugPortal";

describe("pickSystemBugPortalHost", () => {
  it("uses the document body when no modal is open", () => {
    const root = document.createElement("div");
    expect(pickSystemBugPortalHost(root)).toBe(root);
  });

  it("uses the top task modal, not the report dialog", () => {
    const root = document.createElement("div");
    const task = document.createElement("div");
    task.className = "MuiModal-root";
    const report = document.createElement("div");
    report.className = "MuiModal-root";
    report.setAttribute("data-system-bug-dialog", "");
    root.append(task, report);
    expect(pickSystemBugPortalHost(root)).toBe(task);
  });

  it("skips the report modal when the marker is on a child", () => {
    const root = document.createElement("div");
    const task = document.createElement("div");
    task.className = "MuiModal-root";
    const report = document.createElement("div");
    report.className = "MuiModal-root";
    const title = document.createElement("h2");
    title.setAttribute("data-system-bug-dialog", "");
    report.append(title);
    root.append(task, report);
    expect(pickSystemBugPortalHost(root)).toBe(task);
  });
});
