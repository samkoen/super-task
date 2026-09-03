import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ChatPhotoAnnotateReplyDialog from "./ChatPhotoAnnotateReplyDialog";
import { he } from "../../i18n/he";

vi.mock("../../utils/fetchMediaBlob", () => ({
  fetchMediaBlob: vi.fn().mockResolvedValue(new Blob(["img"], { type: "image/jpeg" })),
}));

vi.mock("../media/PhotoAnnotationCanvas", async () => {
  const { forwardRef, useImperativeHandle } = await import("react");
  const { he: labels } = await import("../../i18n/he");
  return {
    default: forwardRef(function MockPhotoAnnotationCanvas(
      _props: unknown,
      ref: React.ForwardedRef<{ exportFile: () => Promise<File> }>,
    ) {
      useImperativeHandle(ref, () => ({
        exportFile: async () => new File(["marked"], "reply.jpg", { type: "image/jpeg" }),
      }));
      return (
        <div>
          <button type="button" aria-label={labels.photoAnnotateEllipse} />
          <button type="button" aria-label={labels.photoAnnotateArrow} />
        </div>
      );
    }),
  };
});

describe("ChatPhotoAnnotateReplyDialog", () => {
  it("offers ellipse and arrow tools on the received photo", async () => {
    render(
      <ChatPhotoAnnotateReplyDialog
        photoUrl="/uploads/p.jpg"
        sending={false}
        onClose={vi.fn()}
        onSend={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(he.photoAnnotateEllipse)).toBeTruthy();
      expect(screen.getByLabelText(he.photoAnnotateArrow)).toBeTruthy();
    });
  });

  it("sends the annotated copy of the received photo", async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(
      <ChatPhotoAnnotateReplyDialog
        photoUrl="/uploads/p.jpg"
        sending={false}
        onClose={vi.fn()}
        onSend={onSend}
      />,
    );
    await waitFor(() => {
      expect(screen.getByLabelText(he.photoAnnotateEllipse)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: he.taskChatSend }));
    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith(expect.objectContaining({ name: "reply.jpg" }));
    });
  });
});
