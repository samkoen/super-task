import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionRequirement } from "../utils/completionMedia";
import { createMemorySlotStorage, createSlotUploadQueue, slotQueueId } from "../utils/slotUploadQueue";

vi.mock("../services/taskService", () => ({ taskService: { submitSlot: vi.fn() } }));

import { useSlotUploads } from "./useSlotUploads";

const requirements: CompletionRequirement[] = [
  { kind: "video", min_seconds: 5, title: "a" },
  { kind: "video", min_seconds: 5, title: "b" },
  { kind: "message", title: "c" },
];
const file = (name = "v.webm") => new File(["abc"], name, { type: "video/webm" });

function makeQueue(send: (id: string) => Promise<unknown> = async () => ({ task_submitted: false })) {
  const storage = createMemorySlotStorage();
  const queue = createSlotUploadQueue({ storage, send: (entry) => send(entry.id), isOnline: () => true });
  return { queue, storage };
}

function mount(queue: ReturnType<typeof makeQueue>["queue"]) {
  return renderHook(() =>
    useSlotUploads({
      occurrenceId: "occ",
      requirements,
      completion: null as never,
      queue,
      locate: async () => ({ lat: 32.1, lng: 34.8 }),
      onSent: vi.fn(),
      onSavedOnDevice: vi.fn(),
      onFailed: vi.fn(),
    }),
  );
}

async function confirm(hook: ReturnType<typeof mount>, index: number, seconds = 9) {
  act(() => hook.result.current.film(index, file(), seconds));
  act(() => hook.result.current.keep(index));
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useSlotUploads: confirmed media survives a reload", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
  });

  it("writes the confirmed media on disk without sending it", async () => {
    const send = vi.fn(async () => ({}));
    const { queue, storage } = makeQueue(send);
    const hook = mount(queue);
    await confirm(hook, 0);
    await waitFor(async () => expect((await storage.getAll()).map((row) => row.status)).toEqual(["held"]));
    expect((await storage.getAll())[0].location).toEqual({ lat: 32.1, lng: 34.8 });
    await queue.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it("a reloaded screen finds the card confirmed, and the final send uploads the file", async () => {
    const send = vi.fn(async () => ({ task_submitted: false }));
    const { queue, storage } = makeQueue(send);
    const before = mount(queue);
    await confirm(before, 1, 8);
    await waitFor(async () => expect(await storage.getAll()).toHaveLength(1));
    before.unmount();

    const after = mount(queue);
    await waitFor(() => expect(after.result.current.states[1].status).toBe("ready"));
    expect(after.result.current.states[1].durationSeconds).toBe(8);
    expect(send).not.toHaveBeenCalled();

    await act(async () => {
      await after.result.current.sendAll();
    });
    expect(send).toHaveBeenCalledWith(slotQueueId("occ", 1));
    expect(after.result.current.states[1].status).toBe("sent");
    expect(await storage.getAll()).toEqual([]);
  });

  it("filming the slot again replaces the confirmed take on disk with the new, unconfirmed one", async () => {
    const { queue, storage } = makeQueue();
    const hook = mount(queue);
    await confirm(hook, 0);
    await waitFor(async () => expect((await storage.getAll()).map((row) => row.status)).toEqual(["held"]));
    act(() => hook.result.current.film(0, file("again.webm"), 6));
    await waitFor(async () =>
      expect((await storage.getAll()).map((row) => [row.status, row.fileName])).toEqual([["draft", "again.webm"]]),
    );
    expect(hook.result.current.states[0].status).toBe("filmed");
  });

  it("still sends the file from memory when writing to disk failed", async () => {
    const send = vi.fn(async () => ({ task_submitted: false }));
    const { queue } = makeQueue(send);
    const hold = vi.spyOn(queue, "hold").mockRejectedValue(new Error("quota"));
    const hook = mount(queue);
    await confirm(hook, 0);
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hold).toHaveBeenCalled();
    expect(send).toHaveBeenCalledWith(slotQueueId("occ", 0));
    expect(hook.result.current.states[0].status).toBe("sent");
  });

  it("drops the local copy when the server already has the slot, so it is not sent again", async () => {
    const send = vi.fn(async () => ({}));
    const { queue, storage } = makeQueue(send);
    await queue.enqueue({
      occurrenceId: "occ",
      slotIndex: 0,
      kind: "video",
      file: file(),
      durationSeconds: 9,
      capturedAt: "t",
    });
    const completion = { completion_attachments: [{ kind: "video", url: "/u/1.webm", captured_at: "t" }] };
    renderHook(() =>
      useSlotUploads({
        occurrenceId: "occ",
        requirements,
        completion: completion as never,
        queue,
        locate: async () => null,
        onSent: vi.fn(),
        onSavedOnDevice: vi.fn(),
        onFailed: vi.fn(),
      }),
    );
    await waitFor(async () => expect(await storage.getAll()).toEqual([]));
    await queue.flush();
    expect(send).not.toHaveBeenCalled();
  });

  it("a text message is not written to disk", async () => {
    const { queue, storage } = makeQueue();
    const hook = mount(queue);
    act(() => hook.result.current.keepText(2, "salut"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(await storage.getAll()).toEqual([]);
  });

  it("a video filmed but not confirmed is still there after leaving the app", async () => {
    const send = vi.fn(async () => ({ task_submitted: false }));
    const { queue, storage } = makeQueue(send);
    const before = mount(queue);
    act(() => before.result.current.film(0, file("a.webm"), 7, true));
    await waitFor(async () => expect((await storage.getAll()).map((row) => row.status)).toEqual(["draft"]));
    before.unmount();

    const after = mount(queue);
    await waitFor(() => expect(after.result.current.states[0].status).toBe("filmed"));
    expect(after.result.current.states[0]).toMatchObject({ durationSeconds: 7, lightOk: true, previewUrl: "blob:preview" });
    act(() => after.result.current.keep(0));
    await waitFor(async () => expect((await storage.getAll()).map((row) => row.status)).toEqual(["held"]));
    expect(send).not.toHaveBeenCalled();
    await act(async () => {
      await after.result.current.sendAll();
    });
    expect(send).toHaveBeenCalledWith(slotQueueId("occ", 0));
    expect(after.result.current.states[0].status).toBe("sent");
  });

  it("a discarded take is removed from disk", async () => {
    const { queue, storage } = makeQueue();
    const hook = mount(queue);
    act(() => hook.result.current.film(0, file(), 7));
    await waitFor(async () => expect(await storage.getAll()).toHaveLength(1));
    act(() => hook.result.current.discard(0));
    await waitFor(async () => expect(await storage.getAll()).toEqual([]));
  });

  it("a new take replaces the confirmed one at send time, even when the disk refuses to store it", async () => {
    const storage = createMemorySlotStorage();
    const sentFiles: string[] = [];
    const queue = createSlotUploadQueue({
      storage,
      send: async (entry) => {
        sentFiles.push(entry.fileName);
        return { task_submitted: false };
      },
      isOnline: () => true,
    });
    const hook = mount(queue);
    act(() => hook.result.current.film(0, file("old.webm"), 9));
    act(() => hook.result.current.keep(0));
    await waitFor(async () => expect((await storage.getAll()).map((row) => row.status)).toEqual(["held"]));

    vi.spyOn(queue, "draft").mockRejectedValue(new Error("quota"));
    vi.spyOn(queue, "hold").mockRejectedValue(new Error("quota"));
    act(() => hook.result.current.film(0, file("new.webm"), 8));
    act(() => hook.result.current.keep(0));
    await waitFor(async () => expect(await storage.getAll()).toEqual([]));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(sentFiles).toEqual(["new.webm"]);
  });

  it("the GPS found after filming is kept with the unconfirmed take and comes back after leaving the app", async () => {
    const { queue, storage } = makeQueue();
    const before = mount(queue);
    act(() => before.result.current.film(0, file(), 7));
    await waitFor(async () => expect((await storage.getAll())[0]?.location).toEqual({ lat: 32.1, lng: 34.8 }));
    expect((await storage.getAll())[0].status).toBe("draft");
    before.unmount();

    const after = mount(queue);
    await waitFor(() => expect(after.result.current.states[0].status).toBe("filmed"));
    expect(after.result.current.states[0].location).toEqual({ lat: 32.1, lng: 34.8 });
  });
});
