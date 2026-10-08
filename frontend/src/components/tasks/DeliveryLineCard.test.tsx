import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeliveryLineCard from "./DeliveryLineCard";
import { taskService } from "../../services/taskService";
import { he } from "../../i18n/he";
import type { DeliveryLineDraft, DeliveryLineView } from "../../utils/deliveryNote";

vi.mock("../../services/taskService", () => ({ taskService: { uploadPhoto: vi.fn() } }));

const line: DeliveryLineView = {
  id: "l1",
  position: 1,
  product_name: "מלפפון",
  quantity: 3,
  unit: "קרטון",
  image_url: null,
};
const problem: DeliveryLineDraft = { arrival: "problem", note: "", photo_url: "" };

function setup(draft: DeliveryLineDraft) {
  const onChange = vi.fn();
  const onError = vi.fn();
  render(<DeliveryLineCard line={line} draft={draft} disabled={false} onChange={onChange} onError={onError} />);
  return { onChange, onError };
}

describe("DeliveryLineCard", () => {
  beforeEach(() => {
    vi.mocked(taskService.uploadPhoto).mockReset();
  });

  it("hides the remark field while the line is OK", () => {
    setup({ arrival: "ok", note: "", photo_url: "" });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("asks for a remark when the line is not OK and empty", () => {
    setup(problem);
    expect(screen.getByText(he.deliveryNoteNoteMissingHint)).toBeTruthy();
  });

  it("attaches the uploaded photo to the draft", async () => {
    vi.mocked(taskService.uploadPhoto).mockResolvedValue({ url: "/u/1.jpg" } as never);
    const { onChange } = setup(problem);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ ...problem, photo_url: "/u/1.jpg" }));
  });

  it("reports an error when the photo upload fails", async () => {
    vi.mocked(taskService.uploadPhoto).mockImplementation(async () => {
      throw new Error("x");
    });
    const { onChange, onError } = setup(problem);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "a.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(onError).toHaveBeenCalledWith(he.errorGeneric));
    expect(onChange).not.toHaveBeenCalled();
  });
});
