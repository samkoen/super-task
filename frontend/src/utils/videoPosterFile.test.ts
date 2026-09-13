import { describe, expect, it, vi } from "vitest";
import { posterFileFromVideoSrc } from "./videoPosterFile";

vi.mock("./videoPoster", () => ({
  captureVideoPoster: vi.fn(async (src: string) =>
    src ? "data:image/jpeg;base64,/9j/4AAQ" : null,
  ),
}));

describe("posterFileFromVideoSrc", () => {
  it("returns a jpeg file from the captured frame", async () => {
    const file = await posterFileFromVideoSrc("blob:video");
    expect(file?.name).toBe("poster.jpg");
    expect(file?.type).toBe("image/jpeg");
  });

  it("returns null when there is no video", async () => {
    expect(await posterFileFromVideoSrc("")).toBeNull();
  });
});
