import { describe, expect, it, vi } from "vitest";
import {
  createMemorySlotStorage,
  createSlotUploadQueue,
  HELD_MAX_AGE_MS,
  slotQueueId,
  type NewQueuedSlot,
  type SlotQueueEvent,
} from "./slotUploadQueue";
import { slotStatesFromCompletion } from "./slotUploadState";

function item(slotIndex = 0, occurrenceId = "occ-1"): NewQueuedSlot {
  return {
    occurrenceId,
    slotIndex,
    kind: "video",
    file: new File(["abc"], "v.webm", { type: "video/webm" }),
    durationSeconds: 12,
    capturedAt: "2026-11-09T06:43:00Z",
    location: { lat: 32.1, lng: 34.8 },
  };
}

function makeQueue(send: (id: string) => Promise<unknown> = async () => ({ ok: true })) {
  const storage = createMemorySlotStorage();
  const clock = { value: 1000 };
  const queue = createSlotUploadQueue({ storage, send: (entry) => send(entry.id), isOnline: () => true, now: () => clock.value });
  const events: SlotQueueEvent[] = [];
  queue.subscribe((event) => events.push(event));
  return { queue, storage, clock, events };
}

describe("held media (confirmed, not sent yet)", () => {
  it("is written to disk but is neither sent nor announced", async () => {
    const send = vi.fn(async () => ({}));
    const { queue, storage, events } = makeQueue(send);
    await queue.hold(item(0));
    await queue.flush();
    expect(send).not.toHaveBeenCalled();
    expect(events).toEqual([]);
    expect((await storage.getAll()).map((row) => row.status)).toEqual(["held"]);
  });

  it("goes out once released, and is removed after the server confirms", async () => {
    const send = vi.fn(async () => ({ ok: true }));
    const { queue, storage } = makeQueue(send);
    await queue.hold(item(0));
    await expect(queue.release(slotQueueId("occ-1", 0))).resolves.toBe(true);
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await storage.getAll()).toEqual([]);
  });

  it("release says false when nothing was held for the slot (already pending counts as nothing)", async () => {
    const { queue } = makeQueue();
    expect(await queue.release(slotQueueId("occ-1", 3))).toBe(false);
    await queue.enqueue(item(1));
    expect(await queue.release(slotQueueId("occ-1", 1))).toBe(false);
  });

  it("holding again replaces the previous take of the same slot", async () => {
    const { queue } = makeQueue();
    await queue.hold(item(0));
    await queue.hold({ ...item(0), durationSeconds: 7 });
    const rows = await queue.list("occ-1");
    expect(rows).toHaveLength(1);
    expect(rows[0].durationSeconds).toBe(7);
  });

  it("dropHeld removes a held entry but never one that is being sent", async () => {
    const { queue } = makeQueue();
    await queue.hold(item(0));
    await queue.enqueue(item(1));
    await queue.dropHeld(slotQueueId("occ-1", 0));
    await queue.dropHeld(slotQueueId("occ-1", 1));
    expect((await queue.list()).map((row) => row.slotIndex)).toEqual([1]);
  });

  it("pruneHeld deletes only held entries older than the limit", async () => {
    const { queue, clock } = makeQueue();
    await queue.hold(item(0));
    await queue.enqueue(item(1));
    clock.value += HELD_MAX_AGE_MS + 1;
    await queue.hold(item(2));
    await queue.pruneHeld();
    expect((await queue.list()).map((row) => row.slotIndex).sort()).toEqual([1, 2]);
  });
});

describe("slotStatesFromCompletion with held media", () => {
  const requirements = [{ kind: "video" as const, title: "a" }, { kind: "video" as const, title: "b" }];

  it("a held file comes back as a confirmed card after a reload", async () => {
    const { queue } = makeQueue();
    await queue.hold(item(1));
    const states = slotStatesFromCompletion(requirements, null, await queue.list("occ-1"));
    expect(states[0].status).toBe("idle");
    expect(states[1]).toMatchObject({
      status: "ready",
      durationSeconds: 12,
      capturedAt: "2026-11-09T06:43:00Z",
      location: { lat: 32.1, lng: 34.8 },
    });
  });

  it("a pending file is still shown as queued", async () => {
    const { queue } = makeQueue(() => new Promise(() => {}));
    await queue.enqueue(item(0));
    const states = slotStatesFromCompletion(requirements, null, await queue.list("occ-1"));
    expect(states[0].status).toBe("queued");
  });
});
