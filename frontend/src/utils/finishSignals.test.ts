import { describe, expect, it, vi } from "vitest";
import { flushFinishSignals, readFinishMarkers, rememberFinished } from "./finishSignals";

function memoryStore() {
  const rows = new Map<string, string>();
  return { getItem: (key: string) => rows.get(key) ?? null, setItem: (key: string, value: string) => void rows.set(key, value) };
}

const offline = Object.assign(new Error("Network Error"), { code: "ERR_NETWORK", isAxiosError: true });

describe("finishSignals", () => {
  it("keeps the first finish time of a task, once", () => {
    const store = memoryStore();
    rememberFinished("t1", "2026-11-18T10:42:00Z", store);
    rememberFinished("t1", "2026-11-18T11:00:00Z", store);
    rememberFinished("t2", "2026-11-18T10:50:00Z", store);
    expect(readFinishMarkers(store)).toEqual([
      { occurrenceId: "t1", finishedAt: "2026-11-18T10:42:00Z" },
      { occurrenceId: "t2", finishedAt: "2026-11-18T10:50:00Z" },
    ]);
  });

  it("sends every signal and forgets the ones the server received", async () => {
    const store = memoryStore();
    rememberFinished("t1", "a", store);
    rememberFinished("t2", "b", store);
    const send = vi.fn().mockResolvedValue({});
    await flushFinishSignals(send, store);
    expect(send).toHaveBeenCalledTimes(2);
    expect(readFinishMarkers(store)).toEqual([]);
  });

  it("stops without network and keeps what is left for the next try", async () => {
    const store = memoryStore();
    rememberFinished("t1", "a", store);
    rememberFinished("t2", "b", store);
    const send = vi.fn().mockRejectedValue(offline);
    await flushFinishSignals(send, store);
    expect(send).toHaveBeenCalledTimes(1);
    expect(readFinishMarkers(store).map((m) => m.occurrenceId)).toEqual(["t1", "t2"]);
  });

  it("drops a signal the server refuses for good (the files will decide)", async () => {
    const store = memoryStore();
    rememberFinished("gone", "a", store);
    await flushFinishSignals(vi.fn().mockRejectedValue(Object.assign(new Error("not found"), { status: 404 })), store);
    expect(readFinishMarkers(store)).toEqual([]);
  });

  it("survives broken storage", () => {
    expect(readFinishMarkers({ getItem: () => "{oops", setItem: () => undefined })).toEqual([]);
  });
});
