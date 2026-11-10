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

  it("filmé puis confirmé : part tout de suite, sans attendre les autres cartes", async () => {
    const { hook, onSent } = setup(async () => ({ task_submitted: false }));
    act(() => hook.result.current.film(1, file(), 9));
    expect(hook.result.current.states[1].status).toBe("filmed");
    await act(async () => {
      await hook.result.current.confirm(1);
    });
    expect(hook.result.current.states.map((s) => s.status)).toEqual(["idle", "sent", "idle"]);
    expect(onSent).toHaveBeenCalledWith(1, { task_submitted: false });
  });

  it("hors ligne : la vidéo reste sur l'appareil et le toast « sauvé » est demandé", async () => {
    const { hook, onSent, onSavedOnDevice } = setup(async () => ({}), { value: false });
    act(() => hook.result.current.film(0, file(), 9));
    await act(async () => {
      await hook.result.current.confirm(0);
    });
    expect(hook.result.current.states[0].status).toBe("queued");
    expect(onSavedOnDevice).toHaveBeenCalledWith(0);
    expect(onSent).not.toHaveBeenCalled();
  });

  it("le retour du réseau envoie la file puis passe la carte en envoyée", async () => {
    const { hook, queue, online, onSent } = setup(async () => ({ task_submitted: true }), { value: false });
    act(() => hook.result.current.film(0, file(), 9));
    await act(async () => {
      await hook.result.current.confirm(0);
    });
    online.value = true;
    await act(async () => {
      await queue.flush();
    });
    expect(hook.result.current.states[0].status).toBe("sent");
    expect(onSent).toHaveBeenCalledWith(0, { task_submitted: true });
  });

  it("refus du serveur : carte en échec et message remonté", async () => {
    const refusal = Object.assign(new Error("trop court"), { response: { status: 400 } });
    const { hook, onFailed } = setup(async () => {
      throw refusal;
    });
    act(() => hook.result.current.film(0, file(), 2));
    await act(async () => {
      await hook.result.current.confirm(0);
    });
    expect(hook.result.current.states[0].status).toBe("failed");
    expect(onFailed).toHaveBeenCalledWith(0, "trop court");
  });

  it("annuler la revue libère la carte et rien n'est envoyé", async () => {
    const send = vi.fn(async () => ({}));
    const { hook } = setup(send);
    act(() => hook.result.current.film(0, file(), 9));
    act(() => hook.result.current.discard(0));
    await act(async () => {
      await hook.result.current.confirm(0);
    });
    expect(hook.result.current.states[0].status).toBe("idle");
    expect(send).not.toHaveBeenCalled();
  });

  it("une case message est envoyée directement au serveur", async () => {
    submitSlot.mockResolvedValue({ task_submitted: false });
    const { hook, onSent } = setup(async () => ({}));
    await act(async () => {
      await hook.result.current.submitText(2, "tout est propre");
    });
    expect(submitSlot).toHaveBeenCalledWith("occ", 2, { kind: "message", text: "tout est propre" });
    expect(hook.result.current.states[2]).toMatchObject({ status: "sent", text: "tout est propre" });
    expect(onSent).toHaveBeenCalled();
  });

  it("échec réseau d'un message : la case redevient libre", async () => {
    submitSlot.mockRejectedValue(new Error("Failed to fetch"));
    const { hook, onFailed } = setup(async () => ({}));
    await act(async () => {
      await hook.result.current.submitText(2, "x");
    });
    expect(hook.result.current.states[2].status).toBe("idle");
    expect(onFailed).toHaveBeenCalled();
  });

  it("au démarrage, retrouve les vidéos restées sur l'appareil", async () => {
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
