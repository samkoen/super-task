import { describe, expect, it } from "vitest";
import {
  activeAfterRemove,
  changeRequirementKind,
  clearRequirementExample,
  displayHour,
  moveRequirement,
  sameDraft,
  todayAt,
} from "./studioRequirements";
import type { CompletionRequirement } from "./completionMedia";

const list: CompletionRequirement[] = [
  { kind: "video", title: "גיבוי", min_seconds: 10, example_url: "a.jpg", guide_video_url: "g.mp4" },
  { kind: "photo", title: "מקרר", slot: true },
  { kind: "message", title: "הערה" },
];

describe("moveRequirement", () => {
  it("swaps a card with its neighbour", () => {
    expect(moveRequirement(list, 0, 1).map((r) => r.title)).toEqual(["מקרר", "גיבוי", "הערה"]);
    expect(moveRequirement(list, 2, -1).map((r) => r.title)).toEqual(["גיבוי", "הערה", "מקרר"]);
  });
  it("keeps the same list at the edges", () => {
    expect(moveRequirement(list, 0, -1)).toBe(list);
    expect(moveRequirement(list, 2, 1)).toBe(list);
  });
});

describe("changeRequirementKind", () => {
  it("keeps title and examples between photo and video, with a default duration for video", () => {
    const photo = changeRequirementKind(list, 0, "photo")[0];
    expect(photo).toEqual({ kind: "photo", title: "גיבוי", example_url: "a.jpg", guide_video_url: "g.mp4", slot: true });
    const video = changeRequirementKind(list, 1, "video")[1];
    expect(video).toEqual({ kind: "video", title: "מקרר", min_seconds: 10 });
  });
  it("drops the example media for audio and message cards", () => {
    expect(changeRequirementKind(list, 0, "audio")[0]).toEqual({ kind: "audio", title: "גיבוי" });
  });
  it("does nothing when the kind is unchanged", () => {
    expect(changeRequirementKind(list, 1, "photo")[1]).toBe(list[1]);
  });
});

describe("clearRequirementExample", () => {
  it("removes the example image only", () => {
    expect(clearRequirementExample(list, 0)[0]).toEqual({ kind: "video", title: "גיבוי", min_seconds: 10, guide_video_url: "g.mp4" });
  });
});

describe("activeAfterRemove", () => {
  it("follows the active card when an earlier one is removed", () => {
    expect(activeAfterRemove(2, 0, 2)).toBe(1);
  });
  it("stays in range when the last card is removed", () => {
    expect(activeAfterRemove(2, 2, 2)).toBe(1);
    expect(activeAfterRemove(0, 0, 0)).toBe(0);
  });
});

describe("displayHour / todayAt", () => {
  it("formats the header hour like the oved screen", () => {
    expect(displayHour("06:30")).toBe("6:30");
    expect(displayHour("")).toBe("");
  });
  it("builds today's date at the given time", () => {
    const iso = todayAt("07:15", new Date(2026, 10, 14, 22, 0));
    expect(iso).not.toBeNull();
    const d = new Date(iso as string);
    expect([d.getHours(), d.getMinutes(), d.getDate()]).toEqual([7, 15, 14]);
    expect(todayAt("")).toBeNull();
  });
});

describe("sameDraft", () => {
  it("compares plain values and local files", () => {
    const file = new File(["x"], "a.jpg");
    expect(sameDraft({ a: 1, f: file }, { a: 1, f: file })).toBe(true);
    expect(sameDraft({ a: 1 }, { a: 2 })).toBe(false);
  });
});
