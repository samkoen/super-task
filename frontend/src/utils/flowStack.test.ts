import { describe, expect, it } from "vitest";
import { he } from "../i18n/he";
import {
  formatClock,
  formatDueHour,
  greetingFor,
  hasGuide,
  primaryActionLabel,
  resolveActive,
  stackLayout,
  stepNumber,
  tabStatusText,
} from "./flowStack";
import type { SlotUiState, SlotUploadStatus } from "./slotUploadState";

const states = (...statuses: SlotUploadStatus[]): SlotUiState[] =>
  statuses.map((status) => ({ status, kind: "video" }));

describe("pile de cartes", () => {
  it("sans choix : la première carte ouverte est active, les autres sont en dessous", () => {
    expect(stackLayout(states("idle", "idle", "idle"), null)).toEqual({ active: 0, above: [], below: [1, 2] });
  });

  it("les cartes remises passent au-dessus, quel que soit leur nombre", () => {
    const layout = stackLayout(states("sent", "queued", "idle", "idle", "uploading"), null);
    expect(layout).toEqual({ active: 2, above: [0, 1, 4], below: [3] });
  });

  it("ordre libre : l'oved peut choisir la carte 3 avant la 1", () => {
    const layout = stackLayout(states("idle", "idle", "idle"), 2);
    expect(layout).toEqual({ active: 2, above: [], below: [0, 1] });
  });

  it("après l'envoi de la carte choisie, la suivante encore ouverte devient active", () => {
    const layout = stackLayout(states("idle", "sent", "idle"), 1);
    expect(layout.active).toBe(2);
    expect(layout.above).toEqual([1]);
  });

  it("une seule carte : aucune carte en dessous", () => {
    expect(stackLayout(states("idle"), null)).toEqual({ active: 0, above: [], below: [] });
  });

  it("tout est remis : plus de carte active", () => {
    expect(stackLayout(states("sent", "queued"), 0)).toEqual({ active: null, above: [0, 1], below: [] });
    expect(resolveActive(states("sent"), null)).toBeNull();
  });

  it("une carte en échec reste ouverte pour être renvoyée", () => {
    expect(resolveActive(states("sent", "failed"), null)).toBe(1);
  });

  it("liste vide", () => {
    expect(stackLayout([], null)).toEqual({ active: null, above: [], below: [] });
  });
});

describe("formats", () => {
  it("numéro à deux chiffres", () => {
    expect(stepNumber(0)).toBe("01");
    expect(stepNumber(9)).toBe("10");
  });

  it("heure d'envoi et heure prévue", () => {
    const d = new Date(2026, 10, 9, 6, 5).toISOString();
    expect(formatClock(d)).toBe("06:05");
    expect(formatDueHour(new Date(2026, 10, 9, 6, 30).toISOString())).toBe("6:30");
    expect(formatClock("n'importe quoi")).toBe("");
    expect(formatClock(null)).toBe("");
    expect(formatDueHour(undefined)).toBe("");
  });

  it("salutation selon l'heure, prénom seulement", () => {
    expect(greetingFor("אבי כהן", new Date(2026, 10, 9, 7))).toBe(he.flowGreetingMorning("אבי"));
    expect(greetingFor("אבי", new Date(2026, 10, 9, 14))).toBe(he.flowGreetingNoon("אבי"));
    expect(greetingFor("אבי", new Date(2026, 10, 9, 21))).toBe(he.flowGreetingEvening("אבי"));
  });
});

describe("libellés pilotés par la config du menahel", () => {
  it("le bouton suit le type de sous-tâche", () => {
    expect(primaryActionLabel("video")).toBe(he.flowActionVideo);
    expect(primaryActionLabel("photo")).toBe(he.flowActionPhoto);
    expect(primaryActionLabel("audio")).toBe(he.flowActionAudio);
    expect(primaryActionLabel("message")).toBe(he.flowActionMessage);
  });

  it("le lien d'exemple n'apparaît que si le menahel a donné une image ou une consigne", () => {
    expect(hasGuide({ kind: "video" })).toBe(false);
    expect(hasGuide({ kind: "video", hint: "  " })).toBe(false);
    expect(hasGuide({ kind: "video", hint: "lentement" })).toBe(true);
    expect(hasGuide({ kind: "photo", example_url: "/x.png" })).toBe(true);
    expect(hasGuide({ kind: "video", guide_video_url: "/how.mp4" })).toBe(true);
  });

  it("texte de l'onglet replié", () => {
    const sentAt = new Date(2026, 10, 9, 6, 43).toISOString();
    expect(tabStatusText({ status: "sent", kind: "video", sentAt })).toBe(he.flowTabSent("06:43"));
    expect(tabStatusText({ status: "queued", kind: "video" })).toBe(he.flowTabWaiting);
    expect(tabStatusText({ status: "failed", kind: "video" })).toBe(he.flowTabFailed);
    expect(tabStatusText({ status: "uploading", kind: "video" })).toBe(he.flowTabUploading);
  });
});
