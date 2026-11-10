import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extensionFor, trimVideo, TrimUnsupportedError, type TrimDeps } from "./videoTrim";

/** Faux <video> : la lecture avance de 1 s par 100 ms simulées. */
class FakeVideo extends EventTarget {
  muted = false;
  playsInline = false;
  preload = "";
  ended = false;
  currentTime = 0;
  paused = true;
  stopped = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly capturable = true, private readonly length = 20) {
    super();
  }
  get captureStream() {
    return this.capturable ? () => ({ getTracks: () => [{ stop: () => (this.stopped = true) }] }) as unknown as MediaStream : undefined;
  }
  set src(_value: string) {
    queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata")));
  }
  removeAttribute() {}
  load() {}
  async play() {
    this.paused = false;
    this.timer = setInterval(() => {
      this.currentTime += 1;
      if (this.currentTime >= this.length) this.ended = true;
    }, 100);
  }
  pause() {
    this.paused = true;
    if (this.timer) clearInterval(this.timer);
  }
}

function patchSeek(video: FakeVideo) {
  let time = 0;
  Object.defineProperty(video, "currentTime", {
    get: () => time,
    set: (value: number) => {
      time = value;
      queueMicrotask(() => video.dispatchEvent(new Event("seeked")));
    },
  });
}

class FakeRecorder {
  state: "inactive" | "recording" = "inactive";
  mimeType = "video/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() {
    this.state = "recording";
    this.ondataavailable?.({ data: new Blob(["chunk"]) });
  }
  stop() {
    this.state = "inactive";
    this.onstop?.();
  }
}

function deps(video: FakeVideo, recorder = new FakeRecorder()): TrimDeps {
  patchSeek(video);
  return {
    createVideo: () => video as unknown as HTMLVideoElement,
    createRecorder: () => recorder as unknown as MediaRecorder,
    pollMs: 10,
  };
}

describe("trimVideo", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("records the chosen portion and reports its duration", async () => {
    const video = new FakeVideo();
    const promise = trimVideo("blob:src", { start: 2, end: 6 }, deps(video));
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;
    expect(result.durationSeconds).toBe(4);
    expect(result.file.type).toBe("video/webm");
    expect(result.file.name.endsWith(".webm")).toBe(true);
    expect(result.file.size).toBeGreaterThan(0);
    expect(video.muted).toBe(true);
    expect(video.stopped).toBe(true);
  });

  it("stops at the end of the video even if the end is beyond it", async () => {
    const video = new FakeVideo(true, 5);
    const promise = trimVideo("blob:src", { start: 1, end: 9 }, deps(video));
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toMatchObject({ durationSeconds: 8 });
  });

  it("fails clearly when the device cannot capture a video stream", async () => {
    const promise = trimVideo("blob:src", { start: 0, end: 3 }, deps(new FakeVideo(false)));
    await expect(promise).rejects.toBeInstanceOf(TrimUnsupportedError);
  });

  it("gives up if the playback never reaches the end", async () => {
    const video = new FakeVideo(true, 1000);
    video.play = async () => {
      video.paused = false;
    };
    const promise = trimVideo("blob:src", { start: 0, end: 3 }, deps(video));
    const failure = expect(promise).rejects.toThrow("trim-timeout");
    await vi.advanceTimersByTimeAsync(10_000);
    await failure;
  });
});

describe("extensionFor", () => {
  it("uses mp4 only for mp4 recordings", () => {
    expect(extensionFor("video/mp4")).toBe("mp4");
    expect(extensionFor("video/webm;codecs=vp9")).toBe("webm");
  });
});
