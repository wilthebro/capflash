import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    // Serve onnxruntime-web's WASM/mjs files from our own origin (/ort/). The
    // library defaults them to a CDN, and ORT then builds its threading
    // workers from cross-origin URLs, which browsers refuse to construct.
    // The worker points env.backends.onnx.wasm.wasmPaths at this path.
    //
    // Note: ORT's bundle entry also references a wasm via `new URL(..., import.meta.url)`,
    // which Vite resolves and emits into assets/ (~24 MB). It is dead weight — ORT
    // skips its own default whenever wasmPaths is already set — but it is harmless:
    // nothing fetches it, and it stays in the gitignored dist/.
    viteStaticCopy({
      targets: [{ src: '../node_modules/onnxruntime-web/dist/*', dest: 'ort' }],
    }),
  ],
  build: {
    // The Whisper/ONNX chunk is several MB by nature (it is lazy-loaded).
    chunkSizeWarningLimit: 4000,
  },
  resolve: {
    alias: {
      '@captioner/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
