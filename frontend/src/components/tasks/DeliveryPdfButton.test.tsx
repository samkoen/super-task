import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import DeliveryPdfButton from "./DeliveryPdfButton";
import { he } from "../../i18n/he";

describe("DeliveryPdfButton", () => {
  it("opens a stored pdf through the authenticated media proxy", () => {
    render(<DeliveryPdfButton url="/uploads/delivery_notes/a.pdf" />);
    const link = screen.getByRole("link", { name: he.deliveryNotePdf }) as HTMLAnchorElement;
    expect(link.href).toContain("/api/media/proxy?src=");
    expect(decodeURIComponent(link.href)).toContain("/uploads/delivery_notes/a.pdf");
  });

  it("keeps a public pdf address as it is", () => {
    render(<DeliveryPdfButton url="https://example.test/teuda.pdf" />);
    expect((screen.getByRole("link") as HTMLAnchorElement).href).toBe("https://example.test/teuda.pdf");
  });

  it("renders nothing without a pdf", () => {
    const { container } = render(<DeliveryPdfButton url={null} />);
    expect(container.textContent).toBe("");
  });
});
