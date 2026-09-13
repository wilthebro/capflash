import type { Word } from '@captioner/shared';

/** What the browser can do, probed on the main thread for display only. */
export interface WhisperCapabilities {
  webgpu: boolean;
  adapterInfo: string | null;
  crossOriginIsolated: boolean;
  statusLine: string;
  note?: string;
}

export interface WhisperModelInfo {
  /** Sum of the model's file sizes on the Hub (0 when it could not be queried). */
  totalBytes: number;
  fileCount: number;
  cached: boolean;
}

export type WhisperPhase = 'idle' | 'decoding' | 'loading' | 'warmup' | 'transcribing' | 'done' | 'error';

export interface WhisperStatus {
  phase: WhisperPhase;
  /** 0..1 while downloading model files; null otherwise. */
  downloadProgress: number | null;
  downloadFile: string | null;
  elapsedSec: number;
  error: string | null;
}

export interface WhisperResult {
  words: Word[];
  rawText: string;
  warnings: string[];
}

export type WorkerIn =
  | { type: 'getModelInfo'; requestId: string; modelId: string }
  | { type: 'load'; requestId: string; modelId: string }
  | {
      type: 'transcribe';
      requestId: string;
      audio: Float32Array;
      durationSec: number;
      /** Omitted for English-only models (they reject any language argument). */
      language?: string;
    };

export type WorkerOut =
  | { type: 'model-info'; requestId: string; info: WhisperModelInfo }
  | { type: 'load-progress'; file: string; progress: number; loaded: number; total: number }
  | { type: 'warmup' }
  | { type: 'load-done'; requestId: string }
  | { type: 'transcribe-done'; requestId: string; text: string; words: Word[]; dropped: number }
  | { type: 'error'; requestId?: string; message: string };
