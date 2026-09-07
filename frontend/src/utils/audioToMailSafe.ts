const TARGET_RATE = 16_000;
const SAFE_TYPES = new Set([
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
]);

export type PcmSource = {
  numberOfChannels: number;
  sampleRate: number;
  length: number;
  getChannelData: (channel: number) => Float32Array;
};

export function isMailSafeAudioType(mime: string): boolean {
  return SAFE_TYPES.has((mime || "").split(";")[0].trim().toLowerCase());
}

export function mailAudioFileName(blob: Blob): string {
  const type = blob.type.split(";")[0].toLowerCase();
  if (type.includes("mpeg") || type.includes("mp3")) return "explanation.mp3";
  if (type.includes("mp4") || type.includes("aac") || type.includes("m4a")) return "explanation.m4a";
  return "explanation.wav";
}

export async function toMailSafeAudio(blob: Blob | null): Promise<Blob | null> {
  if (!blob || blob.size === 0) return null;
  if (isMailSafeAudioType(blob.type)) return blob;
  try {
    return await blobToWav(blob);
  } catch {
    return blob;
  }
}

export function mixDownsample(source: PcmSource, targetRate: number = TARGET_RATE): Int16Array {
  const ratio = source.sampleRate / targetRate;
  const outLen = Math.max(1, Math.floor(source.length / ratio));
  const out = new Int16Array(outLen);
  for (let i = 0; i < outLen; i += 1) {
    out[i] = floatToInt16(sampleAt(source, i * ratio));
  }
  return out;
}

export function encodePcmWav(samples: Int16Array, sampleRate: number = TARGET_RATE): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  writeWavHeader(view, samples.length, sampleRate);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1, offset += 2) {
    view.setInt16(offset, samples[i], true);
  }
  return new Blob([bytes], { type: "audio/wav" });
}

async function blobToWav(blob: Blob): Promise<Blob> {
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) throw new Error("no AudioContext");
  const ctx = new Ctor();
  try {
    const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
    return encodePcmWav(mixDownsample(buffer), TARGET_RATE);
  } finally {
    await ctx.close();
  }
}

function sampleAt(source: PcmSource, srcIndex: number): number {
  const index = Math.min(source.length - 1, Math.floor(srcIndex));
  let sum = 0;
  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    sum += source.getChannelData(channel)[index] ?? 0;
  }
  return sum / Math.max(1, source.numberOfChannels);
}

function floatToInt16(value: number): number {
  const clipped = Math.max(-1, Math.min(1, value));
  return clipped < 0 ? Math.round(clipped * 0x8000) : Math.round(clipped * 0x7fff);
}

function writeWavHeader(view: DataView, sampleCount: number, sampleRate: number): void {
  const dataBytes = sampleCount * 2;
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataBytes, true);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}
