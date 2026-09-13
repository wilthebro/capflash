import { useEffect } from 'react';
import { probeWhisperCapabilities } from '../lib/whisper/capabilities';
import { getWhisperModelInfo } from '../lib/whisper/whisperClient';
import type { WhisperModelInfo } from '../lib/whisper/whisperTypes';
import { useWhisperStore } from '../store/whisperStore';

/** Subscribe to the Whisper worker's status, probing browser capabilities once. */
export function useWhisper() {
  const status = useWhisperStore((s) => s.status);
  const capabilities = useWhisperStore((s) => s.capabilities);
  const modelInfo = useWhisperStore((s) => s.modelInfo);
  const result = useWhisperStore((s) => s.result);
  const busy = useWhisperStore((s) => s.busy);

  useEffect(() => {
    if (useWhisperStore.getState().capabilities) return;
    let alive = true;
    void probeWhisperCapabilities().then((caps) => {
      if (alive) useWhisperStore.getState().setCapabilities(caps);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { status, capabilities, modelInfo, result, busy };
}

/** Real download size and cache state for one model, fetched once per id. */
export function useWhisperModelInfo(modelId: string): WhisperModelInfo | undefined {
  const info = useWhisperStore((s) => s.modelInfo[modelId]);

  useEffect(() => {
    if (info) return;
    let alive = true;
    void getWhisperModelInfo(modelId)
      .then((fetched) => {
        if (alive) useWhisperStore.getState().setModelInfo(modelId, fetched);
      })
      .catch(() => {
        // Offline or no Hub access — the picker falls back to its size table.
      });
    return () => {
      alive = false;
    };
  }, [modelId, info]);

  return info;
}
