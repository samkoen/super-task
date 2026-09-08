import { beforeEach, describe, expect, it, vi } from "vitest";

const { emptyBody, mockPost } = vi.hoisted(() => ({
  emptyBody: {} as Record<string, never>,
  mockPost: vi.fn(),
}));

vi.mock("./api", () => ({
  EMPTY_JSON_BODY: emptyBody,
  default: {
    post: (...args: unknown[]) => mockPost(...args),
    get: vi.fn(),
  },
}));

import { EMPTY_JSON_BODY } from "./api";
import { taskService } from "./taskService";

const started = {
  message: "ok",
  occurrence: { id: "occ-1", status: "in_progress" },
};

function expectEmptyJsonPost(url: string) {
  expect(mockPost).toHaveBeenCalledWith(url, EMPTY_JSON_BODY);
  const body = mockPost.mock.calls[0][1];
  expect(body).toBe(emptyBody);
  expect(body).toBeDefined();
  expect(JSON.stringify(body)).toBe("{}");
}

describe("taskService CapacitorHttp empty POST", () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockPost.mockResolvedValue({ data: started });
  });

  it("starts an occurrence with {} so Android CapacitorHttp actually sends the POST", async () => {
    await taskService.start("occ-1");
    expectEmptyJsonPost("/tasks/occurrences/occ-1/start");
  });

  it("resolves a chat task with the same empty JSON body", async () => {
    await taskService.resolveChatTask("occ-1");
    expectEmptyJsonPost("/tasks/occurrences/occ-1/chat-resolve");
  });

  it("posts the completion photo as multipart", async () => {
    mockPost.mockResolvedValue({ data: { url: "/uploads/p.jpg", kind: "photo" } });
    await taskService.uploadPhoto(new File(["x"], "a.jpg", { type: "image/jpeg" }));
    expect(mockPost).toHaveBeenCalledWith(
      "/tasks/upload-photo",
      expect.any(FormData),
      { timeout: 120_000 },
    );
  });

  it("cancels with {} instead of undefined (same CapacitorHttp trap)", async () => {
    mockPost.mockResolvedValue({ data: { message: "ok", occurrence: { id: "occ-1" } } });
    await taskService.cancel("occ-1");
    expect(mockPost).toHaveBeenCalledWith(
      "/tasks/occurrences/occ-1/cancel",
      EMPTY_JSON_BODY,
      { params: undefined },
    );
    expect(JSON.stringify(mockPost.mock.calls[0][1])).toBe("{}");
  });
});
