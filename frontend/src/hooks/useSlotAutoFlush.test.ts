import { describe, expect, it, vi } from "vitest";
import { sendFinishSignalsThenFiles } from "./useSlotAutoFlush";
import { taskService } from "../services/taskService";
import { rememberFinished } from "../utils/finishSignals";

vi.mock("../services/taskService", () => ({ taskService: { finishedOffline: vi.fn() } }));

describe("sendFinishSignalsThenFiles", () => {
  it("sends the small finish signal before the heavy files", async () => {
    localStorage.clear();
    rememberFinished("t1", "2026-11-18T10:42:00Z");
    const order: string[] = [];
    vi.mocked(taskService.finishedOffline).mockImplementation(async () => {
      order.push("signal");
      return {} as never;
    });
    await sendFinishSignalsThenFiles({ flush: async () => void order.push("files") });
    expect(order).toEqual(["signal", "files"]);
    expect(taskService.finishedOffline).toHaveBeenCalledWith("t1", "2026-11-18T10:42:00Z");
  });
});
