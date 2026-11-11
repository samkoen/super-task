import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionRequirement } from "../utils/completionMedia";
import { createMemorySlotStorage, createSlotUploadQueue } from "../utils/slotUploadQueue";
import { markTrimmed, markFilmed, emptySlotStates } from "../utils/slotUploadState";

vi.mock("../services/taskService", () => ({ taskService: { submitSlot: vi.fn() } }));

import { useSlotUploads } from "./useSlotUploads";

const requirements: CompletionRequirement[] = [{ kind: "video", min_seconds: 5, title: "a" }];
const original = () => new File(["original"], "v.webm", { type: "video/webm" });

function setup(trimmer: (src: string) => Promise<{ file: File; durationSeconds: number }>) {
  const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
  return renderHook(() =>
    useSlotUploads({
      occurrenceId: "occ",
      requirements,
      completion: null as never,
      queue,
      locate: async () => null,
      trimmer,
      onSent: vi.fn(),
      onSavedOnDevice: vi.fn(),
      onFailed: vi.fn(),
    }),
  );
}

describe("useSlotUploads.trim", () => {
  beforeEach(() => {
    let n = 0;
    URL.createObjectURL = vi.fn(() => `blob:preview-${++n}`);
  });

  it("replaces the preview and the duration with the trimmed video", async () => {
    const trimmed = new File(["short"], "t.webm", { type: "video/webm" });
    const trimmer = vi.fn(async () => ({ file: trimmed, durationSeconds: 4 }));
    const hook = setup(trimmer);
    act(() => hook.result.current.film(0, original(), 12, true));
    await act(async () => {
      await hook.result.current.trim(0, { start: 2, end: 6 });
    });
    expect(trimmer).toHaveBeenCalledWith("blob:preview-1", { start: 2, end: 6 });
    const slot = hook.result.current.states[0];
    expect(slot.status).toBe("filmed");
    expect(slot.durationSeconds).toBe(4);
    expect(slot.previewUrl).toBe("blob:preview-2");
    expect(slot.lightOk).toBe(true);
  });

  it("does nothing when the slot has no filmed video", async () => {
    const trimmer = vi.fn();
    const hook = setup(trimmer);
    await act(async () => {
      await hook.result.current.trim(0, { start: 1, end: 3 });
    });
    expect(trimmer).not.toHaveBeenCalled();
  });

  it("drops the result when the employee retook the video meanwhile", async () => {
    let finish: (value: { file: File; durationSeconds: number }) => void = () => {};
    const hook = setup(() => new Promise((resolve) => (finish = resolve)));
    act(() => hook.result.current.film(0, original(), 12));
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = hook.result.current.trim(0, { start: 1, end: 3 });
    });
    act(() => hook.result.current.discard(0));
    act(() => hook.result.current.film(0, original(), 9));
    await act(async () => {
      finish({ file: new File(["x"], "t.webm"), durationSeconds: 2 });
      await pending;
    });
    expect(hook.result.current.states[0].durationSeconds).toBe(9);
  });

  it("propagates a failed trim so the player can show an error", async () => {
    const hook = setup(async () => {
      throw new Error("boom");
    });
    act(() => hook.result.current.film(0, original(), 12));
    await expect(hook.result.current.trim(0, { start: 1, end: 3 })).rejects.toThrow("boom");
    expect(hook.result.current.states[0].durationSeconds).toBe(12);
  });
});

describe("confirmation pendant la découpe", () => {
  function open(trimmer: (src: string) => Promise<{ file: File; durationSeconds: number }>) {
    const storage = createMemorySlotStorage();
    const queue = createSlotUploadQueue({ storage, send: async () => ({}), isOnline: () => true });
    const hook = renderHook(() =>
      useSlotUploads({
        occurrenceId: "occ",
        requirements,
        completion: null as never,
        queue,
        locate: async () => null,
        trimmer,
        onSent: vi.fn(),
        onSavedOnDevice: vi.fn(),
        onFailed: vi.fn(),
      }),
    );
    return { hook, storage };
  }

  it("garde le fichier coupé quand אישור arrive avant la fin de la découpe", async () => {
    const trimmed = new File(["short"], "t.webm", { type: "video/webm" });
    let finish: (value: { file: File; durationSeconds: number }) => void = () => {};
    const { hook, storage } = open(() => new Promise((resolve) => (finish = resolve)));
    act(() => hook.result.current.film(0, original(), 12));
    let pending = Promise.resolve();
    act(() => {
      pending = hook.result.current.trim(0, { start: 1, end: 4 });
    });
    act(() => hook.result.current.keep(0));
    expect(await storage.getAll()).toEqual([]);
    await act(async () => {
      finish({ file: trimmed, durationSeconds: 3 });
      await pending;
    });
    await waitFor(async () => expect((await storage.getAll())[0]?.durationSeconds).toBe(3));
    const [kept] = await storage.getAll();
    expect(kept.file).toBe(trimmed);
    expect(kept.status).toBe("held");
    expect(hook.result.current.states[0]).toMatchObject({ status: "ready", durationSeconds: 3 });
  });
});

describe("markTrimmed", () => {
  it("only touches a filmed slot", () => {
    const idle = emptySlotStates(requirements);
    expect(markTrimmed(idle, 0, { durationSeconds: 3, previewUrl: "blob:x" })).toBe(idle);
    const filmed = markFilmed(idle, 0, { capturedAt: "t", durationSeconds: 9, previewUrl: "blob:a" });
    const next = markTrimmed(filmed, 0, { durationSeconds: 3, previewUrl: "blob:b" });
    expect(next[0]).toMatchObject({ status: "filmed", durationSeconds: 3, previewUrl: "blob:b", capturedAt: "t" });
  });
});
