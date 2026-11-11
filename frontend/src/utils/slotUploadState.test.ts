import { describe, expect, it } from "vitest";
import type { CompletionRequirement } from "./completionMedia";
import type { QueuedSlot, SlotQueueEvent } from "./slotUploadQueue";
import {
  allHandedOver,
  applyQueueEvent,
  discardFilmed,
  emptySlotStates,
  firstOpenIndex,
  handedOverCount,
  markFilmed,
  mergeStoredSlots,
  nextOpenIndex,
  sentCount,
  slotStatesFromCompletion,
  waitingUploadCount,
  withLocation,
} from "./slotUploadState";

describe("mergeStoredSlots", () => {
  it("remplit une case libre et laisse une case déjà en file tranquille", () => {
    const current = emptySlotStates(reqs(2)).map((state, index) =>
      index === 1 ? { ...state, status: "queued" as const } : state,
    );
    const stored = emptySlotStates(reqs(2)).map((state) => ({ ...state, status: "ready" as const }));
    const merged = mergeStoredSlots(current, stored);
    expect(merged.map((state) => state.status)).toEqual(["ready", "queued"]);
  });

  it("rend le même tableau quand rien ne change", () => {
    const current = emptySlotStates(reqs(1));
    expect(mergeStoredSlots(current, current)).toBe(current);
  });
});

describe("withLocation", () => {
  const position = { lat: 31.77, lng: 35.21 };

  it("attache le GPS à une prise en cours et l'efface si on la jette", () => {
    const filmed = markFilmed(emptySlotStates(reqs(2)), 0, { capturedAt: "t" });
    const located = withLocation(filmed, 0, position);
    expect(located[0].location).toEqual(position);
    expect(discardFilmed(located, 0)[0].location).toBeNull();
  });

  it("ignore une position tardive sur une case libre ou hors liste", () => {
    const states = emptySlotStates(reqs(2));
    expect(withLocation(states, 0, position)).toBe(states);
    expect(withLocation(states, 9, position)).toBe(states);
  });
});

const reqs = (n: number): CompletionRequirement[] =>
  Array.from({ length: n }, (_, i) => ({ kind: "video", min_seconds: 5, title: `v${i}` }));

function entry(slotIndex: number, extra: Partial<QueuedSlot> = {}): QueuedSlot {
  return {
    id: `occ:${slotIndex}`,
    occurrenceId: "occ",
    slotIndex,
    kind: "video",
    file: new Blob(["x"]),
    fileName: "v.webm",
    mimeType: "video/webm",
    durationSeconds: 8,
    capturedAt: "2026-11-09T06:00:00Z",
    createdAt: 1,
    attempts: 0,
    status: "pending",
    ...extra,
  };
}

describe("slotUploadState", () => {
  it("part de cartes libres, quel que soit leur nombre", () => {
    for (const n of [1, 2, 4, 5, 10]) {
      expect(emptySlotStates(reqs(n))).toHaveLength(n);
    }
    expect(emptySlotStates(reqs(2)).every((s) => s.status === "idle")).toBe(true);
  });

  it("reprend ce que le serveur a déjà reçu", () => {
    const completion = {
      completion_attachments: [
        { kind: "video" as const, url: "/u/1.webm", duration_seconds: 9, captured_at: "2026-11-09T06:43:00Z" },
        { kind: "video" as const, url: "" },
      ],
    };
    const states = slotStatesFromCompletion(reqs(3), completion);
    expect(states.map((s) => s.status)).toEqual(["sent", "idle", "idle"]);
    expect(states[0].sentAt).toBe("2026-11-09T06:43:00Z");
  });

  it("une sous-tâche refusée par le menahel redevient à refaire, avec sa remarque", () => {
    const completion = {
      completion_attachments: [
        { kind: "video" as const, url: "/u/1.webm", review: { status: "rejected" as const, remark: "trop sombre" } },
      ],
    };
    const [first] = slotStatesFromCompletion(reqs(1), completion);
    expect(first).toMatchObject({ status: "idle", remark: "trop sombre", sentAt: null });
  });

  it("une copie locale ne recouvre pas une case déjà reçue, et une copie acquittée ne repart pas", () => {
    const sent = {
      completion_attachments: [{ kind: "video" as const, url: "/u/1.webm", captured_at: "t" }],
    };
    expect(slotStatesFromCompletion(reqs(1), sent, [entry(0)])[0].status).toBe("sent");
    expect(slotStatesFromCompletion(reqs(1), sent, [entry(0, { status: "held" })])[0].status).toBe("sent");
    expect(slotStatesFromCompletion(reqs(1), null, [entry(0, { status: "acked" })])[0].status).toBe("idle");
    const rejected = {
      completion_attachments: [
        { kind: "video" as const, url: "/u/1.webm", review: { status: "rejected" as const, remark: "x" } },
      ],
    };
    expect(slotStatesFromCompletion(reqs(1), rejected, [entry(0, { status: "held" })])[0].status).toBe("ready");
  });

  it("les entrées en attente sur l'appareil passent en queued, les refusées en failed", () => {
    const states = slotStatesFromCompletion(reqs(3), null, [
      entry(0),
      entry(2, { status: "failed", lastError: "refus" }),
    ]);
    expect(states.map((s) => s.status)).toEqual(["queued", "idle", "failed"]);
    expect(states[2].error).toBe("refus");
  });

  it("filmed puis discard", () => {
    let states = markFilmed(emptySlotStates(reqs(2)), 1, { capturedAt: "t", durationSeconds: 7, previewUrl: "blob:x" });
    expect(states[1]).toMatchObject({ status: "filmed", durationSeconds: 7, previewUrl: "blob:x" });
    states = discardFilmed(states, 1);
    expect(states[1].status).toBe("idle");
    expect(discardFilmed(states, 0)).toBe(states);
  });

  it("événements de la file : hors ligne → en attente → envoyé", () => {
    const base = emptySlotStates(reqs(2));
    const e = entry(0);
    const run = (type: SlotQueueEvent["type"], states: ReturnType<typeof emptySlotStates>) =>
      applyQueueEvent(states, "occ", { type, entry: e, result: null } as SlotQueueEvent, () => "NOW");
    let states = run("queued", base);
    expect(states[0].status).toBe("queued");
    states = run("uploading", states);
    expect(states[0].status).toBe("uploading");
    states = run("sent", states);
    expect(states[0]).toMatchObject({ status: "sent", sentAt: "NOW" });
    expect(run("failed", states)[0].status).toBe("failed");
  });

  it("ignore les événements d'une autre tâche ou d'un slot hors limites", () => {
    const base = emptySlotStates(reqs(1));
    const other = applyQueueEvent(base, "autre", { type: "queued", entry: entry(0) });
    expect(other).toBe(base);
    const out = applyQueueEvent(base, "occ", { type: "queued", entry: entry(5) });
    expect(out[0].status).toBe("idle");
  });

  it("compteurs : envoyé, en attente, remis", () => {
    const states = emptySlotStates(reqs(4)).map((s, i) => ({
      ...s,
      status: (["sent", "queued", "uploading", "failed"] as const)[i],
    }));
    expect(sentCount(states)).toBe(1);
    expect(waitingUploadCount(states)).toBe(2);
    expect(handedOverCount(states)).toBe(3);
    expect(allHandedOver(states)).toBe(false);
    expect(allHandedOver(states.map((s) => ({ ...s, status: "sent" as const })))).toBe(true);
    expect(allHandedOver([])).toBe(false);
  });

  it("ordre libre : la prochaine case ouverte saute les cartes déjà remises", () => {
    const states = emptySlotStates(reqs(4)).map((s, i) => ({ ...s, status: i === 1 ? ("sent" as const) : s.status }));
    expect(nextOpenIndex(states, 0)).toBe(2);
    expect(nextOpenIndex(states, 3)).toBe(0);
    expect(firstOpenIndex(states)).toBe(0);
  });

  it("plus rien d'ouvert → null", () => {
    const states = emptySlotStates(reqs(2)).map((s) => ({ ...s, status: "sent" as const }));
    expect(nextOpenIndex(states, 0)).toBeNull();
    expect(firstOpenIndex(states)).toBe(0);
  });
});
