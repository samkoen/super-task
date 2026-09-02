import { describe, expect, it } from "vitest";
import { chatBubbleCopySx, chatBubbleSx, isChatAudioOnly } from "./chatBubbleSx";

describe("chatBubbleSx", () => {
  it("uses contrast text on own green bubbles, not muted grey", () => {
    const mine = chatBubbleSx({ mine: true });
    expect(mine.color).toBe("primary.contrastText");
    expect(mine.bgcolor).toBe("primary.main");
    expect(chatBubbleCopySx.color).toBe("inherit");
  });

  it("stretches an audio-only line across the chat width", () => {
    const audio = chatBubbleSx({ mine: false, audioOnly: true });
    expect(audio.alignSelf).toBe("stretch");
    expect(audio.width).toBe("100%");
    expect(audio.maxWidth).toBe("100%");
    expect(isChatAudioOnly({ audioUrl: "/a.webm", text: "" })).toBe(true);
    expect(isChatAudioOnly({ audioUrl: "/a.webm", text: "שלום" })).toBe(false);
  });
});
