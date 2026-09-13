import {
  env,
  ModelRegistry,
  pipeline,
  type AutomaticSpeechRecognitionPipeline,
} from '@huggingface/transformers';
import { wordsFromWhisperChunks } from '@captioner/shared';
import { WHISPER_SAMPLE_RATE } from './audio';
import type { WhisperModelInfo, WorkerIn, WorkerOut } from './whisperTypes';

const TASK = 'automatic-speech-recognition';
// The `_timestamped` repos ship quantized exports; q8 is also the WASM default.
const DTYPE = 'q8';
// 'auto' lets ONNX Runtime try its providers in order (WebNN → WebGPU → WASM),
// so a browser without WebGPU still works, just slower.
const DEVICE = 'auto';

type Transcriber = InstanceType<typeof AutomaticSpeechRecognitionPipeline>;

// This module runs in a worker; the project's DOM lib has no worker globals.
const ctx = self as unknown as {
  postMessage(message: WorkerOut): void;
  onmessage: ((event: MessageEvent<WorkerIn>) => void) | null;
};

// Point ONNX Runtime at the wasm/mjs files we serve from our own origin (see
// vite.config.ts). The library's CDN default makes ORT construct its threading
// workers from cross-origin URLs, which browsers refuse to do.
function useSelfHostedOrt(): void {
  if (env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = `${import.meta.env.BASE_URL}ort/`;
  }
}
useSelfHostedOrt();

let transcriber: Transcriber | null = null;
let loadedModelId: string | null = null;

ctx.onmessage = (event) => {
  void handle(event.data);
};

async function handle(msg: WorkerIn): Promise<void> {
  try {
    switch (msg.type) {
      case 'getModelInfo':
        ctx.postMessage({ type: 'model-info', requestId: msg.requestId, info: await modelInfo(msg.modelId) });
        return;
      case 'load':
        await load(msg.modelId);
        ctx.postMessage({ type: 'load-done', requestId: msg.requestId });
        return;
      case 'transcribe':
        await transcribe(msg);
        return;
    }
  } catch (err) {
    ctx.postMessage({ type: 'error', requestId: msg.requestId, message: errorMessage(err) });
  }
}

/** Sizes and cache state straight from the Hub, so the picker can be honest. */
async function modelInfo(modelId: string): Promise<WhisperModelInfo> {
  const options = { dtype: DTYPE, device: DEVICE } as const;
  const files = await ModelRegistry.get_pipeline_files(TASK, modelId, options);
  let totalBytes = 0;
  for (const file of files) {
    try {
      const meta = await ModelRegistry.get_file_metadata(modelId, file);
      if (meta.size) totalBytes += meta.size;
    } catch {
      // A file we cannot measure simply does not count towards the total.
    }
  }
  const cached = await ModelRegistry.is_pipeline_cached(TASK, modelId, options);
  return { totalBytes, fileCount: files.length, cached };
}

async function load(modelId: string): Promise<void> {
  if (transcriber && loadedModelId === modelId) return;

  // Re-assert before the session is created: transformers.js populates this env
  // while its module evaluates, so this is only a guard against that changing.
  useSelfHostedOrt();

  if (transcriber) {
    const previous = transcriber as unknown as { dispose?: () => unknown };
    transcriber = null;
    loadedModelId = null;
    await previous.dispose?.();
  }

  // Aggregate progress across every file of the model, so the bar reflects the
  // whole download rather than jumping per file.
  const files = new Map<string, { loaded: number; total: number }>();
  transcriber = await pipeline(TASK, modelId, {
    device: DEVICE,
    dtype: DTYPE,
    progress_callback: (p) => {
      if (p.status !== 'progress') return;
      files.set(p.file, { loaded: p.loaded, total: p.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      ctx.postMessage({
        type: 'load-progress',
        file: p.file,
        progress: total > 0 ? Math.min(1, loaded / total) : 0,
        loaded,
        total,
      });
    },
  });
  loadedModelId = modelId;

  // A first inference compiles the WebGPU shaders and allocates buffers; doing
  // it here keeps it out of the timed transcription.
  ctx.postMessage({ type: 'warmup' });
  await transcriber(new Float32Array(WHISPER_SAMPLE_RATE), transcribeOptions());
}

async function transcribe(msg: Extract<WorkerIn, { type: 'transcribe' }>): Promise<void> {
  if (!transcriber) throw new Error('The speech model is not loaded.');
  const output = await transcriber(msg.audio, transcribeOptions(msg.language));
  const { words, dropped } = wordsFromWhisperChunks(output.chunks, { durationSec: msg.durationSec });
  ctx.postMessage({
    type: 'transcribe-done',
    requestId: msg.requestId,
    text: output.text ?? '',
    words,
    dropped,
  });
}

function transcribeOptions(language?: string) {
  return {
    return_timestamps: 'word' as const,
    chunk_length_s: 30,
    stride_length_s: 5,
    // English-only models throw if any language is passed.
    ...(language ? { language } : {}),
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
