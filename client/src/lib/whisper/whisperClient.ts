import { useWhisperStore } from '../../store/whisperStore';
import { WHISPER_SAMPLE_RATE, decodeVideoAudioToPCM } from './audio';
import { DEFAULT_WHISPER_MODEL, loadWhisperPrefs } from './models';
import type { WhisperModelInfo, WhisperResult, WorkerIn, WorkerOut } from './whisperTypes';

/** Thrown when the user cancels; dialogs treat it as "stopped", not "failed". */
export class WhisperCancelled extends Error {
  constructor() {
    super('Transcription cancelled.');
    this.name = 'WhisperCancelled';
  }
}

type TranscribeDone = Extract<WorkerOut, { type: 'transcribe-done' }>;

interface Pending {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
}

/**
 * Owns the worker. Deliberately module-level rather than component state: the
 * loaded model must stay warm when the dialog closes, and cancelling terminates
 * the worker (the model files stay in the browser cache, so the next run does
 * not download them again).
 */
let worker: Worker | null = null;
let requestSeq = 0;
let generation = 0;
let elapsedTimer: number | null = null;
const pending = new Map<string, Pending>();

const nextId = () => `r${++requestSeq}`;

function ensureWorker(): Worker {
  if (worker) return worker;
  const created = new Worker(new URL('./whisperWorker.ts', import.meta.url), { type: 'module' });
  created.onmessage = (event: MessageEvent<WorkerOut>) => receive(event.data);
  created.onerror = (event: ErrorEvent) => {
    const message = event.message || 'The speech recognition worker stopped unexpectedly.';
    worker = null;
    failAll(new Error(message));
  };
  worker = created;
  return created;
}

function send<T>(msg: WorkerIn, transfer: Transferable[] = []): Promise<T> {
  const target = ensureWorker();
  return new Promise<T>((resolve, reject) => {
    pending.set(msg.requestId, { resolve: resolve as (value: unknown) => void, reject });
    target.postMessage(msg, transfer);
  });
}

function receive(msg: WorkerOut): void {
  const store = useWhisperStore.getState();
  switch (msg.type) {
    case 'load-progress':
      store.setStatus({ phase: 'loading', downloadProgress: msg.progress, downloadFile: msg.file });
      return;
    case 'warmup':
      store.setStatus({ phase: 'warmup', downloadProgress: null, downloadFile: null });
      return;
    case 'model-info': {
      const p = pending.get(msg.requestId);
      if (!p) return;
      pending.delete(msg.requestId);
      p.resolve(msg.info);
      return;
    }
    case 'load-done': {
      const p = pending.get(msg.requestId);
      if (!p) return;
      pending.delete(msg.requestId);
      p.resolve(undefined);
      return;
    }
    case 'transcribe-done': {
      const p = pending.get(msg.requestId);
      if (!p) return;
      pending.delete(msg.requestId);
      p.resolve(msg);
      return;
    }
    case 'error': {
      const err = new Error(msg.message);
      const p = msg.requestId ? pending.get(msg.requestId) : undefined;
      if (p) {
        pending.delete(msg.requestId!);
        p.reject(err);
        return;
      }
      failAll(err);
      return;
    }
  }
}

function failAll(err: Error): void {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
  stopTimer();
  const store = useWhisperStore.getState();
  store.setBusy(false);
  store.setStatus({ phase: 'error', error: err.message, downloadProgress: null, downloadFile: null });
}

function startTimer(): void {
  stopTimer();
  const started = Date.now();
  elapsedTimer = window.setInterval(() => {
    useWhisperStore.getState().setStatus({ elapsedSec: (Date.now() - started) / 1000 });
  }, 500);
}

function stopTimer(): void {
  if (elapsedTimer !== null) {
    window.clearInterval(elapsedTimer);
    elapsedTimer = null;
  }
}

/** Model file sizes / cache state, for the picker. Rejects if the Hub is unreachable. */
export async function getWhisperModelInfo(modelId: string): Promise<WhisperModelInfo> {
  return send<WhisperModelInfo>({ type: 'getModelInfo', requestId: nextId(), modelId });
}

/**
 * Decode the file's audio, make sure the model is loaded, then transcribe.
 * The worker reports progress through the store as it goes.
 */
export async function runWhisper(opts: {
  file: File;
  modelId?: string;
  language?: string;
}): Promise<WhisperResult> {
  const gen = generation;
  const modelId = opts.modelId ?? loadWhisperPrefs().modelId ?? DEFAULT_WHISPER_MODEL;
  const store = useWhisperStore.getState();

  store.setBusy(true);
  store.setResult(null);
  store.setStatus({ phase: 'decoding', downloadProgress: null, downloadFile: null, elapsedSec: 0, error: null });

  try {
    const audio = await decodeVideoAudioToPCM(opts.file);
    if (gen !== generation) throw new WhisperCancelled();
    const durationSec = audio.length / WHISPER_SAMPLE_RATE;

    store.setStatus({ phase: 'loading' });
    await send<void>({ type: 'load', requestId: nextId(), modelId });
    if (gen !== generation) throw new WhisperCancelled();

    store.setStatus({ phase: 'transcribing', downloadProgress: null, downloadFile: null, elapsedSec: 0 });
    startTimer();
    const done = await send<TranscribeDone>(
      {
        type: 'transcribe',
        requestId: nextId(),
        audio,
        durationSec,
        ...(opts.language ? { language: opts.language } : {}),
      },
      [audio.buffer as ArrayBuffer],
    );
    stopTimer();

    const warnings = done.dropped > 0 ? [`${done.dropped} word(s) skipped (invalid timestamps).`] : [];
    const result: WhisperResult = { words: done.words, rawText: done.text.trim(), warnings };
    store.setResult(result);
    store.setStatus({ phase: 'done' });
    return result;
  } catch (err) {
    stopTimer();
    if (err instanceof WhisperCancelled || gen !== generation) throw new WhisperCancelled();
    const message = err instanceof Error ? err.message : String(err);
    store.setStatus({ phase: 'error', error: message, downloadProgress: null, downloadFile: null });
    throw err;
  } finally {
    if (gen === generation) useWhisperStore.getState().setBusy(false);
  }
}

/** Stop immediately: the worker is terminated, so nothing keeps running. */
export function cancelWhisper(): void {
  generation++;
  stopTimer();
  const target = worker;
  worker = null;
  target?.terminate();

  const cancelled = new WhisperCancelled();
  for (const p of pending.values()) p.reject(cancelled);
  pending.clear();

  const store = useWhisperStore.getState();
  store.setBusy(false);
  store.setStatus({ phase: 'idle', error: null, downloadProgress: null, downloadFile: null, elapsedSec: 0 });
}
