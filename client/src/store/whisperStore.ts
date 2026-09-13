import { create } from 'zustand';
import type {
  WhisperCapabilities,
  WhisperModelInfo,
  WhisperResult,
  WhisperStatus,
} from '../lib/whisper/whisperTypes';

const IDLE_STATUS: WhisperStatus = {
  phase: 'idle',
  downloadProgress: null,
  downloadFile: null,
  elapsedSec: 0,
  error: null,
};

/**
 * Observable mirror of the Whisper worker. The worker itself lives in a module
 * singleton (`lib/whisper/whisperClient.ts`) so a loaded model stays warm after
 * the dialog closes; this store is only what the dialogs render from.
 */
interface WhisperStoreState {
  status: WhisperStatus;
  capabilities: WhisperCapabilities | null;
  /** Live download size / cache state per model id, when it could be queried. */
  modelInfo: Record<string, WhisperModelInfo>;
  result: WhisperResult | null;
  busy: boolean;

  setStatus(patch: Partial<WhisperStatus>): void;
  setCapabilities(caps: WhisperCapabilities): void;
  setModelInfo(modelId: string, info: WhisperModelInfo): void;
  setResult(result: WhisperResult | null): void;
  setBusy(busy: boolean): void;
  resetRun(): void;
}

export const useWhisperStore = create<WhisperStoreState>()((set) => ({
  status: { ...IDLE_STATUS },
  capabilities: null,
  modelInfo: {},
  result: null,
  busy: false,

  setStatus: (patch) => set((s) => ({ status: { ...s.status, ...patch } })),
  setCapabilities: (capabilities) => set({ capabilities }),
  setModelInfo: (modelId, info) => set((s) => ({ modelInfo: { ...s.modelInfo, [modelId]: info } })),
  setResult: (result) => set({ result }),
  setBusy: (busy) => set({ busy }),
  resetRun: () => set({ status: { ...IDLE_STATUS }, result: null }),
}));
