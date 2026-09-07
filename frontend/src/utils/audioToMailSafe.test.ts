import { describe, expect, it } from "vitest";
import {
  encodePcmWav,
  isMailSafeAudioType,
  mailAudioFileName,
  mixDownsample,
} from "./audioToMailSafe";

describe("mail-safe audio", () => {
  it("treats wav and mp3 as gmail-safe", () => {
    expect(isMailSafeAudioType("audio/wav")).toBe(true);
    expect(isMailSafeAudioType("audio/mpeg")).toBe(true);
    expect(isMailSafeAudioType("audio/webm;codecs=opus")).toBe(false);
  });

  it("names files by mime", () => {
    expect(mailAudioFileName(new Blob([], { type: "audio/wav" }))).toBe("explanation.wav");
    expect(mailAudioFileName(new Blob([], { type: "audio/mpeg" }))).toBe("explanation.mp3");
  });

  it("encodes pcm as a riff wave", () => {
    const samples = new Int16Array([0, 1000, -1000, 0]);
    const blob = encodePcmWav(samples, 16000);
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + samples.length * 2);
  });

  it("downsamples to 16 kHz mono", () => {
    const data = new Float32Array([0, 0.5, 0, -0.5]);
    const source = {
      numberOfChannels: 1,
      sampleRate: 32000,
      length: 4,
      getChannelData: () => data,
    };
    const out = mixDownsample(source, 16000);
    expect(out.length).toBe(2);
  });
});
