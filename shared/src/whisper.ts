import { defaultId } from './style';
import type { Word } from './types';

/** One chunk as returned by transformers.js with `return_timestamps: 'word'`. */
export interface WhisperChunk {
  text: string;
  timestamp: [number, number];
}

export interface WhisperWordsOptions {
  /** Audio/video duration in seconds; every timestamp is clamped into [0, durationSec]. */
  durationSec: number;
  makeId?: () => string;
  /** Words shorter than this are dropped (default 0.05). */
  minDurationSec?: number;
}

/**
 * Convert Whisper word chunks into the editor's `Word[]`.
 *
 * Timestamps are clamped to the media duration unconditionally: chunked mode
 * (chunk_length_s) can emit word timestamps past the end of the audio because
 * the final chunk is zero-padded, and the JS pipeline does not clamp them
 * itself. Chunks with empty text are skipped silently (they are not words);
 * chunks dropped for bad timings are counted in `dropped` so the caller can warn.
 */
export function wordsFromWhisperChunks(
  chunks: readonly WhisperChunk[] | undefined,
  opts: WhisperWordsOptions,
): { words: Word[]; dropped: number } {
  const makeId = opts.makeId ?? defaultId;
  const minDurationSec = opts.minDurationSec ?? 0.05;
  const words: Word[] = [];
  let dropped = 0;

  for (const chunk of chunks ?? []) {
    const text = (chunk?.text ?? '').trim();
    if (!text) continue;
    const [rawStart, rawEnd] = chunk?.timestamp ?? [];
    if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) {
      dropped++;
      continue;
    }
    const start = Math.max(0, Math.min(opts.durationSec, rawStart as number));
    const end = Math.max(0, Math.min(opts.durationSec, rawEnd as number));
    if (end - start <= minDurationSec) {
      dropped++;
      continue;
    }
    words.push({ id: makeId(), text, start, end });
  }

  words.sort((a, b) => a.start - b.start);
  return { words, dropped };
}
