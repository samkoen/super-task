import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionRequirement } from "../utils/completionMedia";
import { createMemorySlotStorage, createSlotUploadQueue } from "../utils/slotUploadQueue";

const { submitSlot } = vi.hoisted(() => ({ submitSlot: vi.fn() }));
vi.mock("../services/taskService", () => ({ taskService: { submitSlot } }));

import { useSlotUploads } from "./useSlotUploads";

const requirements: CompletionRequirement[] = [
  { kind: "video", min_seconds: 5, title: "a" },
  { kind: "video", min_seconds: 5, title: "b" },
  { kind: "message", title: "c" },
];

function setup(send: (id: string) => Promise<unknown>, online = { value: true }, completion = null as never) {
  const queue = createSlotUploadQueue({
    storage: createMemorySlotStorage(),
    send: (entry) => send(entry.id),
    isOnline: () => online.value,
  });
  const onSent = vi.fn();
  const onSavedOnDevice = vi.fn();
  const onFailed = vi.fn();
  const hook = renderHook(() =>
    useSlotUploads({ occurrenceId: "occ", requirements, completion, queue, onSent, onSavedOnDevice, onFailed }),
  );
  return { queue, hook, onSent, onSavedOnDevice, onFailed, online };
}

const file = () => new File(["abc"], "v.webm", { type: "video/webm" });

describe("useSlotUploads", () => {
  beforeEach(() => {
    submitSlot.mockReset();
    URL.createObjectURL = vi.fn(() => "blob:preview");
  });

  it("confirmed card is kept on the device: nothing is sent yet", async () => {
    const send = vi.fn(async () => ({}));
    const { hook, onSent } = setup(send);
    act(() => hook.result.current.film(1, file(), 9));
    expect(hook.result.current.states[1].status).toBe("filmed");
    act(() => hook.result.current.keep(1));
    expect(hook.result.current.states.map((s) => s.status)).toEqual(["idle", "ready", "idle"]);
    expect(send).not.toHaveBeenCalled();
    expect(submitSlot).not.toHaveBeenCalled();
    expect(onSent).not.toHaveBeenCalled();
  });

  it("sendAll uploads every kept card and marks them sent", async () => {
    const send = vi.fn(async () => ({ task_submitted: false }));
    const { hook, onSent } = setup(send);
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.keep(0));
    act(() => hook.result.current.film(1, file(), 8));
    act(() => hook.result.current.keep(1));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(send).toHaveBeenCalledTimes(2);
    expect(hook.result.current.states.map((s) => s.status)).toEqual(["sent", "sent", "idle"]);
    expect(onSent).toHaveBeenCalledTimes(2);
    expect(hook.result.current.sending).toBe(false);
  });

  it("offline: sendAll leaves the file in the device queue and asks for the saved notice", async () => {
    const { hook, onSent, onSavedOnDevice } = setup(async () => ({}), { value: false });
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[0].status).toBe("queued");
    expect(onSavedOnDevice).toHaveBeenCalledWith(0);
    expect(onSent).not.toHaveBeenCalled();
  });

  it("network back: the queue sends the file and the card becomes sent", async () => {
    const { hook, queue, online, onSent } = setup(async () => ({ task_submitted: true }), { value: false });
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    online.value = true;
    await act(async () => {
      await queue.flush();
    });
    expect(hook.result.current.states[0].status).toBe("sent");
    expect(onSent).toHaveBeenCalledWith(0, { task_submitted: true });
  });

  it("server refusal: card fails with the message, and sendAll retries it", async () => {
    const refusal = Object.assign(new Error("trop court"), { response: { status: 400 } });
    const send = vi.fn().mockRejectedValueOnce(refusal).mockResolvedValueOnce({ task_submitted: true });
    const { hook, onFailed } = setup(send);
    act(() => hook.result.current.film(0, file(), 2));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[0].status).toBe("failed");
    expect(onFailed).toHaveBeenCalledWith(0, "trop court");
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[0].status).toBe("sent");
  });

  it("a discarded video is never sent", async () => {
    const send = vi.fn(async () => ({}));
    const { hook } = setup(send);
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.discard(0));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[0].status).toBe("idle");
    expect(send).not.toHaveBeenCalled();
  });

  it("a message card is kept locally, then sent to the server only by sendAll", async () => {
    submitSlot.mockResolvedValue({ task_submitted: false });
    const { hook, onSent } = setup(async () => ({}));
    act(() => hook.result.current.keepText(2, "tout est propre"));
    expect(hook.result.current.states[2]).toMatchObject({ status: "ready", text: "tout est propre" });
    expect(submitSlot).not.toHaveBeenCalled();
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(submitSlot).toHaveBeenCalledWith("occ", 2, { kind: "message", text: "tout est propre" });
    expect(hook.result.current.states[2]).toMatchObject({ status: "sent", text: "tout est propre" });
    expect(onSent).toHaveBeenCalled();
  });

  it("network failure on a message: the card stays ready to be sent again", async () => {
    submitSlot.mockRejectedValue(new Error("Failed to fetch"));
    const { hook, onFailed } = setup(async () => ({}));
    act(() => hook.result.current.keepText(2, "x"));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[2]).toMatchObject({ status: "ready", text: "x" });
    expect(onFailed).toHaveBeenCalled();
  });

  it("at startup, finds the videos left on the device", async () => {
    const queue = createSlotUploadQueue({
      storage: createMemorySlotStorage(),
      send: async () => ({}),
      isOnline: () => false,
    });
    await queue.enqueue({
      occurrenceId: "occ",
      slotIndex: 1,
      kind: "video",
      file: file(),
      durationSeconds: 8,
      capturedAt: "t",
    });
    const hook = renderHook(() => useSlotUploads({ occurrenceId: "occ", requirements, queue }));
    await waitFor(() => expect(hook.result.current.states[1].status).toBe("queued"));
  });
});

describe("useSlotUploads — GPS du tournage", () => {
  const position = { lat: 31.77, lng: 35.21, accuracy: 8 };

  function gpsHook(locate: () => Promise<typeof position | null>) {
    const send = vi.fn(async (_entry: unknown) => ({}));
    const queue = createSlotUploadQueue({
      storage: createMemorySlotStorage(),
      send: (entry) => send(entry),
      isOnline: () => true,
    });
    const hook = renderHook(() => useSlotUploads({ occurrenceId: "occ", requirements, queue, locate }));
    return { hook, send };
  }

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:preview");
  });

  it("garde la position sur la carte filmée puis l'envoie avec le fichier", async () => {
    const { hook, send } = gpsHook(async () => position);
    act(() => hook.result.current.film(0, file(), 9));
    await waitFor(() => expect(hook.result.current.states[0].location).toEqual(position));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ location: position }));
  });

  it("GPS refusé : la carte reste utilisable et l'envoi part sans position", async () => {
    const { hook, send } = gpsHook(async () => null);
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.keep(0));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(hook.result.current.states[0].location ?? null).toBeNull();
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ location: null }));
  });

  it("une position tardive d'une ancienne prise n'est pas collée à la nouvelle", async () => {
    let resolveFirst: (value: typeof position) => void = () => undefined;
    const locate = vi
      .fn<() => Promise<typeof position | null>>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(async () => null);
    const { hook } = gpsHook(locate);
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.discard(0));
    act(() => hook.result.current.film(0, file(), 7));
    await act(async () => resolveFirst(position));
    expect(hook.result.current.states[0].location ?? null).toBeNull();
  });
});
