export const WHISPER_SAMPLE_RATE = 16000;

type AudioContextCtor = new (options?: AudioContextOptions) => AudioContext;

function audioContextCtor(): AudioContextCtor {
  const ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!ctor) throw new Error('This browser has no Web Audio support, so the audio cannot be decoded.');
  return ctor;
}

/**
 * Decode a video/audio file to the mono 16 kHz Float32 PCM that Whisper wants.
 *
 * `decodeAudioData` reads the audio track straight out of an mp4/webm
 * container, so no ffmpeg round-trip is needed. The whole file is held in
 * memory (encoded bytes + decoded samples) — fine for the clip lengths a
 * caption editor handles, and the file is already in memory as a `File`.
 */
export async function decodeVideoAudioToPCM(file: File): Promise<Float32Array> {
  const encoded = await file.arrayBuffer();
  const ctx = new (audioContextCtor())({ sampleRate: WHISPER_SAMPLE_RATE });
  try {
    const decoded = await ctx.decodeAudioData(encoded);
    const mono = downmix(decoded);
    // The sampleRate option is a hint the browser may ignore, so resample
    // ourselves when the context ended up at a different rate.
    return ctx.sampleRate === WHISPER_SAMPLE_RATE
      ? mono
      : resampleLinear(mono, ctx.sampleRate, WHISPER_SAMPLE_RATE);
  } finally {
    void ctx.close().catch(() => undefined);
  }
}

function downmix(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const first = buffer.getChannelData(0);
  if (channels === 1) return new Float32Array(first);
  const out = new Float32Array(first.length);
  for (let c = 0; c < channels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] = out[i]! + data[i]!;
  }
  for (let i = 0; i < out.length; i++) out[i] = out[i]! / channels;
  return out;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  const outLength = Math.max(1, Math.round((input.length * toRate) / fromRate));
  const out = new Float32Array(outLength);
  if (input.length === 0) return out;
  const step = (input.length - 1) / Math.max(1, outLength - 1);
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const i0 = Math.floor(pos);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = pos - i0;
    out[i] = input[i0]! * (1 - frac) + input[i1]! * frac;
  }
  return out;
}
