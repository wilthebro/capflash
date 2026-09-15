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
      targets: [
        { src: '../node_modules/onnxruntime-web/dist/*', dest: 'ort' },
        // The browser export's ffmpeg core, for the same reason: the library
        // defaults these to a CDN, and its worker must be same-origin with the
        // page. `worker.js` is @ffmpeg/ffmpeg's own worker (not the core's) and
        // is passed as an absolute `classWorkerURL`; it imports ./const.js and
        // ./errors.js, so they have to sit beside it.
        { src: '../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js', dest: 'ffmpeg' },
        { src: '../node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm', dest: 'ffmpeg' },
        { src: '../node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js', dest: 'ffmpeg' },
        { src: '../node_modules/@ffmpeg/ffmpeg/dist/esm/const.js', dest: 'ffmpeg' },
        { src: '../node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js', dest: 'ffmpeg' },
      ],
    }),
  ],
  optimizeDeps: {
    // Pre-bundling @ffmpeg/ffmpeg rewrites its internal worker reference and the
    // module then 404s, so it has to stay out of the dep optimizer.
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
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
