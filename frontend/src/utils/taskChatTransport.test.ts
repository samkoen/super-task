import { describe, expect, it, vi } from "vitest";
import { he } from "../i18n/he";
import { taskService } from "../services/taskService";
import { asTaskChatPage, createTaskChatTransport } from "./taskChatTransport";

vi.mock("../services/taskService", () => ({
  taskService: {
    listMessages: vi.fn(),
    postMessage: vi.fn(),
    uploadPhoto: vi.fn(),
    uploadVideo: vi.fn(),
    uploadAudio: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

describe("taskChatTransport", () => {
  it("normalizes a legacy array page and an empty payload", () => {
    expect(asTaskChatPage([{ id: "m1" }])).toEqual({ messages: [{ id: "m1" }], has_more: false });
    expect(asTaskChatPage({ messages: [{ id: "m2" }], has_more: true })).toEqual({
      messages: [{ id: "m2" }],
      has_more: true,
    });
    expect(asTaskChatPage(null)).toEqual({ messages: [], has_more: false });
  });

  it("posts then notifies the occurrence status", async () => {
    vi.mocked(taskService.postMessage).mockResolvedValue({
      occurrence: { id: "occ-1", status: "awaiting_response" },
      recipient_user_id: "e1",
    } as never);
    const onPosted = vi.fn();
    const transport = createTaskChatTransport({ occurrenceId: "occ-1", onPosted });
    const result = await transport.send({ body: "הנה" });
    expect(taskService.postMessage).toHaveBeenCalledWith("occ-1", { body: "הנה" });
    expect(onPosted).toHaveBeenCalledWith("awaiting_response", he.taskChatSent);
    expect(result.breakFrom).toMatchObject({ recipient_user_id: "e1" });
  });
});
