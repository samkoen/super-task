import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ApiError } from "../services/api";
import { directChatService } from "../services/directChatService";
import { useDirectChatWith } from "./useDirectChatWith";

const feedback = { showError: vi.fn(), showSuccess: vi.fn() };
vi.mock("../context/FeedbackContext", () => ({ useFeedback: () => feedback }));
vi.mock("../services/directChatService", () => ({ directChatService: { openWith: vi.fn() } }));

describe("useDirectChatWith", () => {
  beforeEach(() => {
    feedback.showError.mockReset();
    vi.mocked(directChatService.openWith).mockReset().mockResolvedValue({ conversation: { id: "c1" } } as never);
  });

  it("opens the conversation with the oved", async () => {
    const { result } = renderHook(() => useDirectChatWith());
    await act(() => result.current.open("u1", "שמואל"));
    expect(directChatService.openWith).toHaveBeenCalledWith("u1");
    expect(result.current.chat).toEqual({ id: "c1", title: "שמואל" });
    act(() => result.current.close());
    expect(result.current.chat).toBeNull();
  });

  it("shows the error when the conversation cannot be opened", async () => {
    vi.mocked(directChatService.openWith).mockRejectedValue(new ApiError("לא זמין", 403));
    const { result } = renderHook(() => useDirectChatWith());
    await act(() => result.current.open("u1", "שמואל"));
    expect(feedback.showError).toHaveBeenCalledWith("לא זמין");
    expect(result.current.chat).toBeNull();
  });
});
