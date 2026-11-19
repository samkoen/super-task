import { describe, expect, it } from "vitest";
import { createKeptStore, createMemoryKeptStore } from "./slotKeptStore";
import { slowRows } from "./slotKeptStore.slowRows";
import { HELD_MAX_AGE_MS } from "./slotUploadQueue";

describe("slotKeptStore", () => {
  it("a reason withdrawn just before reopening the task does not come back", async () => {
    const store = createKeptStore(slowRows());
    await store.saveSkip({ occurrenceId: "occ", slotIndex: 1, reasonCode: "no_stock" });
    void store.remove("occ", 1);
    expect(await store.list("occ")).toEqual([]);
  });

  it("a reason saved just before reopening the task is found", async () => {
    const store = createKeptStore(slowRows());
    void store.saveSkip({ occurrenceId: "occ", slotIndex: 1, reasonCode: "other", reasonText: "נעול" });
    expect(await store.list("occ")).toMatchObject([{ kind: "skip", slotIndex: 1, reasonText: "נעול" }]);
  });

  it("one entry per card: a note replaces a reason", async () => {
    const store = createMemoryKeptStore();
    await store.saveSkip({ occurrenceId: "occ", slotIndex: 0, reasonCode: "no_stock" });
    await store.saveText({ occurrenceId: "occ", slotIndex: 0, text: "בסדר" });
    expect(await store.list("occ")).toMatchObject([{ kind: "text", text: "בסדר" }]);
  });

  it("only lists this task, and drops entries older than the held limit", async () => {
    let now = 0;
    const store = createMemoryKeptStore(() => now);
    await store.saveText({ occurrenceId: "old", slotIndex: 0, text: "x" });
    now = HELD_MAX_AGE_MS / 2;
    await store.saveText({ occurrenceId: "occ", slotIndex: 0, text: "y" });
    now = HELD_MAX_AGE_MS + 1;
    expect(await store.list("occ")).toMatchObject([{ text: "y" }]);
    expect(await store.list("old")).toEqual([]);
  });
});
