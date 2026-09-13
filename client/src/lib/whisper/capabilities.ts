import type { WhisperCapabilities } from './whisperTypes';

// Minimal WebGPU shapes: the project does not depend on @webgpu/types.
interface MinimalGpuAdapter {
  info?: { vendor?: string; architecture?: string; description?: string };
}
interface MinimalGpu {
  requestAdapter(): Promise<MinimalGpuAdapter | null>;
}

/**
 * Report what this browser can run. Display-only: the worker always asks
 * transformers.js for `device: 'auto'`, which already builds the correct
 * ordered fallback list (WebNN → WebGPU → WASM) internally. Duplicating that
 * decision here would only risk diverging from the library.
 */
export async function probeWhisperCapabilities(): Promise<WhisperCapabilities> {
  const crossOriginIsolated = self.crossOriginIsolated === true;
  const gpu = (navigator as Navigator & { gpu?: MinimalGpu }).gpu;

  let webgpu = false;
  let adapterInfo: string | null = null;
  if (gpu) {
    try {
      // `navigator.gpu` existing is not enough — it is present but returns no
      // adapter when hardware acceleration is off.
      const adapter = await gpu.requestAdapter();
      if (adapter) {
        webgpu = true;
        const parts = [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean);
        adapterInfo = parts.length > 0 ? parts.join(' ') : 'GPU';
      }
    } catch {
      webgpu = false;
    }
  }

  const statusLine = webgpu
    ? `WebGPU (${adapterInfo})`
    : crossOriginIsolated
      ? 'CPU — WASM, multi-threaded'
      : 'CPU — WASM, single-threaded';

  let note: string | undefined;
  if (!webgpu) {
    note = /firefox/i.test(navigator.userAgent)
      ? 'Firefox: set dom.webgpu.enabled to true in about:config for GPU acceleration. Any model works without it, just slower.'
      : 'No WebGPU adapter available — transcription runs on the CPU and is slower. Tiny or Base is recommended.';
  }

  return { webgpu, adapterInfo, crossOriginIsolated, statusLine, note };
}
