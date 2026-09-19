import { describe, expect, it, vi } from "vitest";
import { startCanvasRecordStream } from "./canvasRecordStream";

describe("startCanvasRecordStream", () => {
  it("returns null when captureStream is unavailable", () => {
    const video = document.createElement("video");
    const audio = { getAudioTracks: () => [] } as unknown as MediaStream;
    const original = HTMLCanvasElement.prototype.captureStream;
    HTMLCanvasElement.prototype.captureStream = undefined as unknown as typeof original;
    expect(startCanvasRecordStream(video, audio)).toBeNull();
    HTMLCanvasElement.prototype.captureStream = original;
  });

  it("records the canvas and copies audio tracks", () => {
    const added: MediaStreamTrack[] = [];
    HTMLCanvasElement.prototype.getContext = () =>
      ({ drawImage: vi.fn() }) as unknown as CanvasRenderingContext2D;
    HTMLCanvasElement.prototype.captureStream = function () {
      return {
        addTrack: (track: MediaStreamTrack) => added.push(track),
        getTracks: () => added,
      } as unknown as MediaStream;
    };
    const mic = { kind: "audio" } as MediaStreamTrack;
    const video = document.createElement("video");
    const audio = { getAudioTracks: () => [mic] } as unknown as MediaStream;
    const result = startCanvasRecordStream(video, audio);
    expect(result).not.toBeNull();
    expect(added).toEqual([mic]);
    result?.stop();
  });
});
