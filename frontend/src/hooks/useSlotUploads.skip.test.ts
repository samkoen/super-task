import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionRequirement } from "../utils/completionMedia";
import { createMemorySlotStorage, createSlotUploadQueue } from "../utils/slotUploadQueue";
import { createKeptStore, createMemoryKeptStore } from "../utils/slotKeptStore";
import { slowRows } from "../utils/slotKeptStore.slowRows";

const { submitSlot, uploadAudio } = vi.hoisted(() => ({ submitSlot: vi.fn(), uploadAudio: vi.fn() }));
vi.mock("../services/taskService", () => ({ taskService: { submitSlot, uploadAudio } }));

import { useSlotUploads } from "./useSlotUploads";

const requirements: CompletionRequirement[] = [
  { kind: "video", min_seconds: 5, title: "a" },
  { kind: "video", min_seconds: 5, title: "b" },
];

function mount() {
  const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
  const callbacks = { onSent: vi.fn(), onSavedOnDevice: vi.fn(), onFailed: vi.fn() };
  const hook = renderHook(() =>
    useSlotUploads({ occurrenceId: "occ", requirements, completion: null as never, queue, locate: async () => null, ...callbacks }),
  );
  return { hook, ...callbacks };
}

beforeEach(() => {
  submitSlot.mockReset().mockResolvedValue({ task_submitted: false });
  uploadAudio.mockReset().mockResolvedValue({ url: "/uploads/voice.webm" });
});

describe("useSlotUploads: « לא ניתן לצלם »", () => {
  it("keeps the reason on the device until the final send, then posts it with the voice explanation", async () => {
    const { hook } = mount();
    const audio = new File(["v"], "voice.webm", { type: "audio/webm" });
    act(() => hook.result.current.skip(1, { reasonCode: "other", reasonText: " הדלת נעולה ", audio }));
    expect(hook.result.current.states[1]).toMatchObject({ status: "skipped", skip: { reasonCode: "other", reasonText: "הדלת נעולה", sent: false } });
    expect(submitSlot).not.toHaveBeenCalled();

    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(uploadAudio).toHaveBeenCalledWith(audio);
    expect(submitSlot).toHaveBeenCalledWith("occ", 1, {
      kind: "video",
      skipped: { reason_code: "other", reason_text: "הדלת נעולה", audio_url: "/uploads/voice.webm" },
    });
    expect(hook.result.current.states[1].skip).toMatchObject({ sent: true, audio: null, audioUrl: "/uploads/voice.webm" });
  });

  it("does not upload any audio when there is none", async () => {
    const { hook } = mount();
    act(() => hook.result.current.skip(0, { reasonCode: "no_stock", reasonText: "", audio: null }));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(uploadAudio).not.toHaveBeenCalled();
    expect(submitSlot).toHaveBeenCalledWith("occ", 0, { kind: "video", skipped: { reason_code: "no_stock" } });
  });

  it("does not send the same reason twice", async () => {
    const { hook } = mount();
    act(() => hook.result.current.skip(0, { reasonCode: "no_stock", reasonText: "", audio: null }));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(submitSlot).toHaveBeenCalledTimes(1);
  });

  it("keeps the reason and reports the error when the voice upload fails, so it can be retried", async () => {
    uploadAudio.mockRejectedValueOnce(new Error("offline"));
    const { hook, onFailed } = mount();
    act(() => hook.result.current.skip(0, { reasonCode: "other", reasonText: "", audio: new File(["v"], "v.webm") }));
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(submitSlot).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledWith(0, "offline");
    expect(hook.result.current.states[0]).toMatchObject({ status: "skipped", error: "offline", skip: { sent: false } });

    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(submitSlot).toHaveBeenCalledTimes(1);
    expect(hook.result.current.states[0].skip?.sent).toBe(true);
  });

  it("ignores a draft without a reason", () => {
    const { hook } = mount();
    act(() => hook.result.current.skip(0, { reasonCode: null, reasonText: "x", audio: null }));
    expect(hook.result.current.states[0].status).toBe("idle");
  });

  it("unskip frees the card again so nothing is sent for it", async () => {
    const { hook } = mount();
    act(() => hook.result.current.skip(0, { reasonCode: "camera_issue", reasonText: "", audio: null }));
    act(() => hook.result.current.unskip(0));
    expect(hook.result.current.states[0]).toMatchObject({ status: "idle", skip: null });
    await act(async () => {
      await hook.result.current.sendAll();
    });
    expect(submitSlot).not.toHaveBeenCalled();
  });
});

describe("useSlotUploads: « לא ניתן לצלם » survives leaving and reopening the task", () => {
  function open(queue: ReturnType<typeof createSlotUploadQueue>, keptStore: ReturnType<typeof createMemoryKeptStore>) {
    return renderHook(() =>
      useSlotUploads({ occurrenceId: "occ", requirements, completion: null as never, queue, keptStore, locate: async () => null }),
    );
  }

  it("brings back the reason (and its voice note) of a card next to a filmed one", async () => {
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
    const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
    const keptStore = createMemoryKeptStore();
    const first = open(queue, keptStore);
    const audio = new File(["v"], "voice.webm", { type: "audio/webm" });
    act(() => first.result.current.film(0, new File(["x"], "a.mp4", { type: "video/mp4" }), 6));
    act(() => first.result.current.keep(0));
    act(() => first.result.current.skip(1, { reasonCode: "other", reasonText: "הדלת נעולה", audio }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    first.unmount();

    const again = open(queue, keptStore);
    await vi.waitFor(() => expect(again.result.current.states[1].status).toBe("skipped"));
    expect(again.result.current.states[0].status).toBe("ready");
    expect(again.result.current.states[1].skip).toMatchObject({ reasonCode: "other", reasonText: "הדלת נעולה", sent: false });
    expect(again.result.current.states[1].skip?.audio?.name).toBe("voice.webm");
    vi.unstubAllGlobals();
  });

  it("a reason withdrawn right before leaving does not come back, even with a slow device storage", async () => {
    const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
    const keptStore = createKeptStore(slowRows());
    const first = open(queue, keptStore as ReturnType<typeof createMemoryKeptStore>);
    act(() => first.result.current.skip(1, { reasonCode: "no_stock", reasonText: "", audio: null }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    act(() => first.result.current.unskip(1));
    first.unmount();

    const again = open(queue, keptStore as ReturnType<typeof createMemoryKeptStore>);
    await act(async () => {
      await keptStore.list("occ");
    });
    expect(again.result.current.states[1].status).toBe("idle");
  });

  it("forgets the reason once it was withdrawn, or once the server has it", async () => {
    const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
    const keptStore = createMemoryKeptStore();
    const first = open(queue, keptStore);
    act(() => first.result.current.skip(0, { reasonCode: "no_stock", reasonText: "", audio: null }));
    act(() => first.result.current.skip(1, { reasonCode: "no_stock", reasonText: "", audio: null }));
    act(() => first.result.current.unskip(0));
    await act(async () => {
      await first.result.current.sendAll();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await keptStore.list("occ")).toEqual([]);
  });
});

describe("useSlotUploads: a confirmed written note survives leaving and reopening the task", () => {
  const withNote: CompletionRequirement[] = [
    { kind: "video", min_seconds: 5, title: "a" },
    { kind: "message", title: "b" } as CompletionRequirement,
  ];
  function open(queue: ReturnType<typeof createSlotUploadQueue>, keptStore: ReturnType<typeof createMemoryKeptStore>) {
    return renderHook(() =>
      useSlotUploads({ occurrenceId: "occ", requirements: withNote, completion: null as never, queue, keptStore, locate: async () => null }),
    );
  }

  it("brings back the note, sends it at the end, then forgets it", async () => {
    const queue = createSlotUploadQueue({ storage: createMemorySlotStorage(), send: async () => ({}), isOnline: () => true });
    const keptStore = createMemoryKeptStore();
    const first = open(queue, keptStore);
    act(() => first.result.current.keepText(1, "הכול תקין"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    first.unmount();

    const again = open(queue, keptStore);
    await vi.waitFor(() => expect(again.result.current.states[1]).toMatchObject({ status: "ready", text: "הכול תקין" }));
    await act(async () => {
      await again.result.current.sendAll();
    });
    expect(submitSlot).toHaveBeenCalledWith("occ", 1, { kind: "message", text: "הכול תקין" });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(await keptStore.list("occ")).toEqual([]);
  });
});
