import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { FeedbackProvider, useFeedback } from "./FeedbackContext";

function wrapper({ children }: { children: ReactNode }) {
  return <FeedbackProvider>{children}</FeedbackProvider>;
}

describe("useFeedback", () => {
  it("exposes showSuccess and showError helpers", () => {
    const { result } = renderHook(() => useFeedback(), { wrapper });
    expect(typeof result.current.showSuccess).toBe("function");
    expect(typeof result.current.showError).toBe("function");
  });

  it("accepts showFeedback without throwing", async () => {
    const { result } = renderHook(() => useFeedback(), { wrapper });
    act(() => {
      result.current.showSuccess("נשמר");
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain("נשמר");
    });
  });
});
