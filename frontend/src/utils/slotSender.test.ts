import { describe, expect, it, vi } from "vitest";

vi.mock("../services/taskService", () => ({ taskService: {} }));

import { attachmentFromUpload, sendQueuedSlot, type SlotSenderDeps } from "./slotSender";
import type { QueuedSlot } from "./slotUploadQueue";

function entry(kind: QueuedSlot["kind"] = "video"): QueuedSlot {
  return {
    id: "occ:1",
    occurrenceId: "occ",
    slotIndex: 1,
    kind,
    file: new Blob(["abc"], { type: "video/webm" }),
    fileName: "v.webm",
    mimeType: "video/webm",
    durationSeconds: 12,
    capturedAt: "2026-11-09T06:43:00Z",
    createdAt: 1,
    attempts: 0,
    status: "pending",
  };
}

function deps(over: Partial<SlotSenderDeps> = {}): SlotSenderDeps {
  return {
    uploadFile: vi.fn(async () => ({ url: "/u/v.webm" })),
    uploadPoster: vi.fn(async () => ({ url: "/u/p.jpg" })),
    submit: vi.fn(async () => ({ task_submitted: false })) as never,
    makePoster: vi.fn(async () => new File(["p"], "poster.jpg")),
    ...over,
  };
}

describe("sendQueuedSlot", () => {
  it("téléverse le fichier puis déclare la sous-tâche avec durée, heure et vignette", async () => {
    const d = deps();
    await sendQueuedSlot(entry(), d);
    expect(d.uploadFile).toHaveBeenCalledWith("video", expect.any(File));
    expect(d.submit).toHaveBeenCalledWith("occ", 1, {
      kind: "video",
      url: "/u/v.webm",
      duration_seconds: 12,
      captured_at: "2026-11-09T06:43:00Z",
      poster_url: "/u/p.jpg",
    });
  });

  it("l'échec de la vignette ne bloque pas l'envoi", async () => {
    const d = deps({ makePoster: vi.fn(async () => Promise.reject(new Error("canvas"))) });
    await sendQueuedSlot(entry(), d);
    const attachment = (d.submit as ReturnType<typeof vi.fn>).mock.calls[0][2];
    expect(attachment.poster_url).toBeUndefined();
  });

  it("une photo n'a pas de vignette", async () => {
    const d = deps();
    await sendQueuedSlot(entry("photo"), d);
    expect(d.makePoster).not.toHaveBeenCalled();
  });

  it("si le téléversement échoue, rien n'est déclaré (l'erreur remonte pour le renvoi)", async () => {
    const d = deps({ uploadFile: vi.fn(async () => Promise.reject(new Error("Failed to fetch"))) });
    await expect(sendQueuedSlot(entry(), d)).rejects.toThrow("Failed to fetch");
    expect(d.submit).not.toHaveBeenCalled();
  });
});

describe("attachmentFromUpload", () => {
  it("omet les champs absents", () => {
    const item = { ...entry("audio"), durationSeconds: null, capturedAt: "" };
    expect(attachmentFromUpload(item, "/u/a.webm")).toEqual({ kind: "audio", url: "/u/a.webm" });
  });

  it("joint le GPS du tournage aux photos/vidéos, jamais à l'audio", () => {
    const location = { lat: 31.77, lng: 35.21, accuracy: 9 };
    expect(attachmentFromUpload({ ...entry("video"), location }, "/u/v.webm").location).toEqual(location);
    expect(attachmentFromUpload({ ...entry("audio"), location }, "/u/a.webm")).not.toHaveProperty("location");
    expect(attachmentFromUpload({ ...entry("video"), location: null }, "/u/v.webm")).not.toHaveProperty("location");
  });
});
