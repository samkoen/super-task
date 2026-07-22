import { describe, expect, it } from "vitest";

/** Miroir léger de la règle d'affichage chat (body localisé). */
function displayChatBody(msg: {
  body: string | null;
  display_body?: string | null;
}): string | null {
  return msg.display_body ?? msg.body;
}

describe("task chat display body", () => {
  it("prefers display_body for recipient view", () => {
    expect(
      displayChatBody({ body: "sawasdee", display_body: "שלום" }),
    ).toBe("שלום");
  });

  it("falls back to body", () => {
    expect(displayChatBody({ body: "hello", display_body: null })).toBe("hello");
  });
});
