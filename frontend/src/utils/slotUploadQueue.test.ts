import { describe, expect, it, vi } from "vitest";
import {
  createMemorySlotStorage,
  createSlotUploadQueue,
  isRetryableSlotError,
  slotQueueId,
  startSlotAutoFlush,
  type NewQueuedSlot,
  type SlotQueueEvent,
} from "./slotUploadQueue";

function item(slotIndex = 0, occurrenceId = "occ-1"): NewQueuedSlot {
  return {
    occurrenceId,
    slotIndex,
    kind: "video",
    file: new File(["abc"], "v.webm", { type: "video/webm" }),
    durationSeconds: 12,
    capturedAt: "2026-11-09T06:43:00Z",
  };
}

function makeQueue(send: (id: string) => Promise<unknown>, online = { value: true }) {
  const storage = createMemorySlotStorage();
  let clock = 0;
  const queue = createSlotUploadQueue({
    storage,
    send: (entry) => send(entry.id),
    isOnline: () => online.value,
    now: () => (clock += 1),
  });
  const events: SlotQueueEvent[] = [];
  queue.subscribe((event) => events.push(event));
  return { queue, storage, events, online };
}

describe("slotUploadQueue", () => {
  it("garde le fichier sur l'appareil jusqu'à la confirmation du serveur", async () => {
    const { queue, storage } = makeQueue(async () => ({ ok: true }));
    await queue.enqueue(item(0));
    expect(await storage.getAll()).toHaveLength(1);
    await queue.flush();
    expect(await storage.getAll()).toHaveLength(0);
  });

  it("émet queued, uploading puis sent", async () => {
    const { queue, events } = makeQueue(async () => "done");
    await queue.enqueue(item(1));
    await queue.flush();
    expect(events.map((event) => event.type)).toEqual(["queued", "uploading", "sent"]);
  });

  it("n'envoie rien hors ligne puis renvoie au retour du réseau", async () => {
    const send = vi.fn(async () => undefined);
    const { queue, storage, online } = makeQueue(send, { value: false });
    await queue.enqueue(item(0));
    await queue.flush();
    expect(send).not.toHaveBeenCalled();
    expect(await storage.getAll()).toHaveLength(1);
    online.value = true;
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(await storage.getAll()).toHaveLength(0);
  });

  it("coupure réseau pendant l'envoi : l'entrée reste en attente et on s'arrête", async () => {
    const networkError = Object.assign(new Error("Network Error"), { isAxiosError: true });
    const send = vi.fn(async () => {
      throw networkError;
    });
    const { queue, storage } = makeQueue(send);
    await queue.enqueue(item(0));
    await queue.enqueue(item(1));
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    const rows = await storage.getAll();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.slotIndex === 0)).toMatchObject({ attempts: 1, status: "pending" });
  });

  it("refus définitif du serveur : marqué failed, sans renvoi automatique", async () => {
    const refusal = Object.assign(new Error("refus"), { response: { status: 400 } });
    const send = vi.fn(async () => {
      throw refusal;
    });
    const { queue, storage, events } = makeQueue(send);
    await queue.enqueue(item(0));
    await queue.flush();
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await storage.getAll())[0]).toMatchObject({ status: "failed", lastError: "refus" });
    expect(events.at(-1)?.type).toBe("failed");
  });

  it("retry remet une entrée refusée en attente", async () => {
    const send = vi
      .fn<(id: string) => Promise<unknown>>()
      .mockRejectedValueOnce(Object.assign(new Error("x"), { response: { status: 422 } }))
      .mockResolvedValue(undefined);
    const { queue, storage } = makeQueue(send);
    await queue.enqueue(item(2));
    await queue.flush();
    await queue.retry(slotQueueId("occ-1", 2));
    await queue.flush();
    expect(await storage.getAll()).toHaveLength(0);
  });

  it("refilmer une sous-tâche remplace l'entrée au lieu de dupliquer", async () => {
    const { queue, storage } = makeQueue(async () => undefined, { value: false });
    await queue.enqueue(item(0));
    await queue.enqueue(item(0));
    expect(await storage.getAll()).toHaveLength(1);
  });

  it("envoie dans l'ordre de filmage", async () => {
    const order: string[] = [];
    const { queue } = makeQueue(async (id) => {
      order.push(id);
    });
    await queue.enqueue(item(2));
    await queue.enqueue(item(0));
    await queue.flush();
    expect(order).toEqual(["occ-1:2", "occ-1:0"]);
  });

  it("liste les entrées d'une seule tâche", async () => {
    const { queue } = makeQueue(async () => undefined, { value: false });
    await queue.enqueue(item(0, "a"));
    await queue.enqueue(item(0, "b"));
    expect(await queue.list("a")).toHaveLength(1);
    expect(await queue.list()).toHaveLength(2);
  });

  it("deux flush simultanés n'envoient qu'une fois", async () => {
    const send = vi.fn(async () => undefined);
    const { queue } = makeQueue(send);
    await queue.enqueue(item(0));
    await Promise.all([queue.flush(), queue.flush()]);
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe("isRetryableSlotError", () => {
  it.each([
    [new Error("Failed to fetch"), true],
    [new Error("timeout of 5000ms exceeded"), true],
    [{ response: { status: 503 } }, true],
    [{ response: { status: 429 } }, true],
    [{ response: { status: 403 } }, false],
    [new Error("boom"), false],
    ["Failed to fetch", true],
  ])("%j → %s", (error, expected) => {
    expect(isRetryableSlotError(error)).toBe(expected);
  });
});

describe("startSlotAutoFlush", () => {
  function setup() {
    const handlers: Record<string, () => void> = {};
    const doc = {
      visibilityState: "visible",
      addEventListener: vi.fn((name: string, fn: () => void) => {
        handlers[name] = fn;
      }),
      removeEventListener: vi.fn(),
    };
    const target = {
      addEventListener: vi.fn((name: string, fn: () => void) => {
        handlers[name] = fn;
      }),
      removeEventListener: vi.fn(),
    };
    let tick: () => void = () => undefined;
    const flush = vi.fn(async () => undefined);
    const stop = startSlotAutoFlush(
      { flush },
      {
        target: target as never,
        doc: doc as never,
        setTimer: (fn) => {
          tick = fn;
          return 7;
        },
        clearTimer: vi.fn(),
      },
    );
    return { handlers, doc, flush, stop, tick: () => tick() };
  }

  it("envoie au démarrage, au retour du réseau, à la reprise de l'app et au minuteur", () => {
    const { handlers, flush, tick } = setup();
    expect(flush).toHaveBeenCalledTimes(1);
    handlers.online();
    handlers.visibilitychange();
    tick();
    expect(flush).toHaveBeenCalledTimes(4);
  });

  it("ne réagit pas quand l'app passe en arrière-plan", () => {
    const { handlers, doc, flush } = setup();
    doc.visibilityState = "hidden";
    handlers.visibilitychange();
    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("stop retire les écouteurs", () => {
    const { stop, doc } = setup();
    stop();
    expect(doc.removeEventListener).toHaveBeenCalled();
  });
});

describe("envoi accepté mais copie locale impossible à effacer", () => {
  it("marque la copie et ne la renvoie jamais, même avec réessayer", async () => {
    const send = vi.fn(async (_id: string) => ({ ok: true }));
    const memory = createMemorySlotStorage();
    const storage = { ...memory, remove: async () => { throw new Error("disk"); } };
    const queue = createSlotUploadQueue({ storage, send: (entry) => send(entry.id), isOnline: () => true });
    const events: SlotQueueEvent[] = [];
    queue.subscribe((event) => events.push(event));
    await queue.enqueue(item(0));
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.type)).toEqual(["queued", "uploading", "sent"]);
    expect((await memory.getAll())[0].status).toBe("acked");
    await queue.retry(slotQueueId("occ-1", 0));
    await queue.flush();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await memory.getAll())[0].status).toBe("acked");
  });
});
