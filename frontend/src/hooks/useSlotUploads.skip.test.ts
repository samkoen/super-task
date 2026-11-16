import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionRequirement } from "../utils/completionMedia";
import { createMemorySlotStorage, createSlotUploadQueue } from "../utils/slotUploadQueue";

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
