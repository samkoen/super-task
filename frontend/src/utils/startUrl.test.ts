import { describe, expect, it, vi } from "vitest";
import { he } from "../i18n/he";
import { normalizeStartUrl, openExternalUrl, startUrlFieldError } from "./startUrl";

describe("startUrl", () => {
  it("accepts the Agroline order page", () => {
    const url = "https://my.agroline.co.il/main/azmanot/client-orders/create";
    expect(normalizeStartUrl(url)).toBe(url);
    expect(startUrlFieldError(url)).toBe("");
  });

  it("rejects empty and javascript urls", () => {
    expect(normalizeStartUrl(null)).toBeNull();
    expect(normalizeStartUrl("javascript:alert(1)")).toBeNull();
    expect(startUrlFieldError("not-a-url")).toBe(he.startUrlInvalid);
  });

  it("opens https in a new tab from the click gesture", () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(openExternalUrl("https://example.com/x")).toBe(true);
    expect(click).toHaveBeenCalled();
    const a = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(a.target).toBe("_blank");
    expect(a.rel).toContain("noopener");
    expect(a.href).toContain("https://example.com/x");
    expect(openExternalUrl("ftp://x")).toBe(false);
    click.mockRestore();
  });
});
