# Captioner

TikTok-style caption editor. Upload a video, get word-level timings (load a transcript JSON, or transcribe the audio in your own browser with Whisper), then design captions — word-by-word or line-by-line with a highlighted spoken word — in a draggable bounding box with full text styling, position them on a caption timeline, and export a burned-in MP4.

## Run it

```powershell
npm install
npm run dev
```

Open http://localhost:5173 (the API server runs on http://localhost:3001).

Requirements: Node 18+. Export runs in the browser by default and needs nothing else. `ffmpeg` on PATH is **optional** — when present, exports can be handed to the local server instead, which is roughly twice as fast (any build with `--enable-libass`; the gyan.dev full build is verified). `ffprobe` is only used by `npm run verify:export`.

## Workflow

1. **Load video** — any browser-playable format.
2. **Get a transcript** — either:
   - **Load transcript** — a JSON array of word timestamps:
     ```json
     [{ "text": "Imagine", "start": 0.07, "end": 0.42 }, { "text": "you", "start": 0.42, "end": 0.6 }]
     ```
   - **Transcribe** — speech-to-text on your own machine (see below). The result can also be downloaded as JSON to reuse elsewhere.

   Words are auto-grouped into caption segments at sentence boundaries.
3. **Fix up the words (optional)** — **Edit transcript** opens the word list for editing: correct a misheard word, nudge a timing, add a word the recognizer dropped, delete a stray one. Captions are regrouped around your edits; each segment keeps its own style and bounding box.
4. **Script (optional)** — upload a plaintext script whose own lines define the caption segments, overriding period-based splitting (timings still come from the transcript; words are aligned in order, so punctuation/case differences are fine). This combines with transcription: paste the script, hit Transcribe, and the script supplies the line breaks while Whisper supplies the timings.
5. **Design** — per segment: display mode (word / line / line + highlighted word), font (the bundled Montserrat, a system face, or your own .ttf/.otf/.woff), weight (Normal / Bold / Heavy), size, color, outline color & width, highlight color, and a bounding box you can drag/resize directly on the preview. In line + highlight mode the spoken word is recoloured, bolded and ~10% larger, so it reads at a glance.

   The box is a **fixed rectangle you size**: drag its body to move it, the right-hand handle for its width, and the bottom handle to set how many lines tall it is. `Lines` and the `Text position` grid do the same from the panel — the grid places the text left/centre/right and top/middle/bottom *within* the box, so a caption shorter than the box can sit anywhere in it.

   A segment that wraps to more lines than the box is tall is **paged**: the first page goes on screen, and once playback reaches a word on the next page it replaces the previous one in the same spot. Every page of a segment is anchored at the same place, so a page turn swaps the text in place rather than making it jump. Set `Lines` to 1 for a single line that pages, or higher to stack them. Within a page the text only gains the highlight as the words are spoken, and nothing blanks out during a pause either: a word holds until the next one starts. A drag is applied when you release the pointer, so the preview stays smooth while you move it.

   Captions all follow the **global box** until you move one individually. Drag the box on the preview with nothing selected — or use the Caption position fields and the Upper/Center/Lower presets — and every linked caption moves with it, so shifting the captions to the centre of the frame is one edit rather than one per caption. Dragging a *selected* caption pins just that one; the segment panel then offers **Reset box to default** to hand it back.

   The default style applies to new segments and can be pushed to all.
6. **Timeline** — the caption track sits above the video track. Drag blocks to move captions in time (their words move with them), drag the edges to trim, shift+click to select several and combine them. Snap to word edges; hold Alt for fine control. Ctrl+wheel zooms. Space plays/pauses, ←/→ nudge, Delete removes the selection.
7. **Stuck?** — **Help** in the top-right corner of the toolbar walks through the whole workflow.
8. **Export MP4** — the editor resolves every line break and position in the browser, then burns them in with libass. By default that happens **in the page**, via ffmpeg compiled to WebAssembly: nothing is uploaded, nothing needs installing, and the video never leaves the machine. The first export downloads the render engine (~32 MB, cached after). If the server has a usable ffmpeg, the dialog offers to hand the job over instead — about twice as fast, which is worth it for long videos.

   One caveat that follows from rendering in the page: the WebAssembly build has no fontconfig, so it can only use font files it is given. The bundled Montserrat and any font you upload carry their bytes and work. A **system** font does not, so the export pulls its bytes through the Local Font Access API (Chromium, and it will ask permission); if that is unavailable the captions in that face are drawn in Montserrat and the dialog says so, rather than exporting blank frames.

Projects save/load as `.captioner.json` files (fonts embedded; re-open the video file after loading).

## Transcription (Whisper, in your browser)

**Transcribe** decodes the loaded video's audio track and runs Whisper on your own machine — the video and audio never leave the browser, and there is no server-side AI. The dialog first reports what your browser can actually run:

| Environment | What you get |
|---|---|
| Chrome / Edge (WebGPU) | GPU inference — comfortably the fastest |
| Any modern browser | CPU via WebAssembly — works everywhere, slower |
| Firefox | CPU unless you set `dom.webgpu.enabled` in `about:config` (the dialog says so when it applies) |

Pick a model — Tiny (~45 MB), Base (~82 MB) or Small (~253 MB), plus English-only variants that are the same size but quicker per word. The first run downloads it from Hugging Face and the browser caches it, so later runs start immediately (the dialog marks cached models and shows live sizes). Multilingual models need the **spoken language** picked explicitly: Whisper does not detect it on its own, so an unset language silently means English. Word timings come from the `_timestamped` model variants, and audio longer than 30 seconds is processed in overlapping chunks.

Long videos are memory-hungry (a 30-minute clip is roughly 115 MB of PCM), and CPU-only machines should stick to Tiny or Base. The WASM backend is single-threaded unless the page is cross-origin isolated; serving the app with `COOP`/`COEP` headers would enable threads (at the cost of needing `CORP` on the model downloads), which is a possible follow-up.

## Development

```powershell
npm test             # shared algorithm unit tests (vitest)
npm run typecheck    # all workspaces
npm run build        # client production build
npm run verify:export # e2e: renders the 8s test video with all modes + custom fonts, verifies with ffprobe
```

`scripts/patch-montserrat.mjs` (re-runnable, in place) rewrites the bundled ExtraBold's family name from `Montserrat ExtraBold` to `Montserrat` and fixes the table checksums, because libass matches `Fontname` against the name table's family record — the stock file is a separate family it would never find, and the export would silently fall back to a different face than the preview.

`verify:export` needs `npm run dev` running and creates its own assets in `test-assets/` (a testsrc2 video and Bebas Neue are generated/downloaded on first run). Set `SMOKE_VIDEO=<path>` to run the same spec against another file (e.g. a no-audio copy).

## Architecture

npm workspaces:

- **`shared/`** — the domain model and pure algorithms, DOM-free and unit-tested: greedy word wrapping, script/transcript alignment (DP edit distance), sentence segmentation, display-event resolution, the ASS generator, Whisper chunk→word conversion (`whisper.ts`), and segment re-normalization after a transcript edit (`reassign.ts`). Both the preview and the export render from the same `DisplayEvent[]` list — including the highlight emphasis (`highlightFontSize`/`highlightFontWeight`, emitted as `\b1\fs<big>` and restored after the span) and the per-segment box fallback to the project's `defaultBox` — so what you see is what gets burned in.
- **`client/`** — React + Vite + Zustand editor. Preview is a DOM overlay over the `<video>` scaled to video pixels; wrapping uses canvas `measureText` (same text engine as the preview); a rAF loop drives word-level playback sync; the bounding box's gold edges are the resolved geometry, and their outline is painted behind the glyphs (`paint-order`) the way libass draws a border. `lib/bundledFonts.ts` registers the shipped Montserrat cuts as `FontFace`s at startup and carries their bytes into the render spec (they are never written into project files). `lib/whisper/` holds the browser transcription: `import('@huggingface/transformers')` is pulled in **only** by the worker, so the main bundle never loads onnxruntime-web, and a model stays warm in a module-level worker between runs (cancelling terminates the worker instead of trying to interrupt inference). `onnxruntime-web`'s WASM binaries are self-hosted from `/ort/` (`vite-plugin-static-copy`) rather than a CDN, which avoids a cross-origin worker-construction failure in dev.
- **`server/`** — Express + multer + ffmpeg. `POST /api/render` takes the resolved spec + video, generates the ASS (libass `ass` filter, `fontsdir` for uploaded fonts), streams progress, and serves the MP4.

### Ad rail

The right-hand column (`client/src/ads/`) ships with house placements, so it renders with no account and no network request. Nothing needs setting up to see it.

#### Connecting AdSense

Four steps, two of them on Google's side. Steps 1 and 2 have to come first — the rail stays empty until they are done, and ads do not serve on localhost at all.

1. **Get the site approved.** In AdSense, add your domain and submit it for review. It needs to be live over HTTPS on a real domain, and it needs enough visible content: a tool with no surrounding text is a common "insufficient content" rejection, so give the page some real description of what it does. Approval is Google's call and can take days.
2. **Create a display ad unit** for that site. It gives you two values: the client id (`ca-pub-…`) and the numeric ad slot. A 300×250 or 300×600 unit fits the rail, which is 300px wide and hidden below 1280px.
3. **Paste the loader snippet** AdSense shows you into `client/index.html`, uncommented and with your own client id (there is a placeholder there waiting). Ads also serve without this — the rail injects the script itself — but the review crawler looks for it in the served HTML, so it belongs in the source.
4. **Fill in the two files that carry your ids:**

   ```ts
   // client/src/ads/config.ts
   export const ADSENSE = { client: 'ca-pub-XXXXXXXXXXXXXXXX', slot: '1234567890' };
   export const AD_PROVIDER: AdProvider = adsenseProvider;   // was houseProvider
   ```

   ```
   # client/public/ads.txt — the same id without the "ca-" prefix
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

   `ads.txt` is served from the domain root (Vite copies `client/public/` there). Without it AdSense serves reduced demand.

**Why AdSense does not rotate here.** A provider is one imperative `mount(container, ctx) => dispose` — imperative because every script-tag network works that way — plus a `rotates` flag. House ads carry `rotates: true`: an ad stays up for at least `AD_MIN_DISPLAY_MS` and is then replaced by the next thing the user does to the player (play/pause, scrub, nudge), which the editor's `togglePlayNonce`/`seekNonce` counters already signal. **AdSense carries `rotates: false`**, because its policy permits refreshing an ad only when the user asks for a refresh; the flag means a network that forbids it cannot be rotated by construction. Rotating *Google* ads would be a Google Ad Manager feature (declared refresh, 30-second minimum) — a new provider with `rotates: true`, same seam.

### Renderer seam

Export goes through a `Renderer` interface (`server/src/lib/renderers/types.ts`). v1 is the libass renderer; a headless-Chrome PNG-overlay renderer (pixel-perfect by construction) can be registered without API changes. Likewise, script alignment goes through `WordAligner` (`shared/src/alignment.ts`) — the installed ffmpeg build even ships a native `whisper` filter, so a Whisper-based forced aligner (script-only import, no JSON) can be added later without touching callers.
