# Captioner

TikTok-style caption editor. Upload a video + word-level transcript, then design captions — word-by-word or line-by-line with a highlighted spoken word — in a draggable bounding box with full text styling, position them on a caption timeline, and export a burned-in MP4.

## Run it

```powershell
npm install
npm run dev
```

Open http://localhost:5173 (the API server runs on http://localhost:3001).

Requirements: Node 18+ and `ffmpeg`/`ffprobe` on PATH (any build with `--enable-libass`; the gyan.dev full build is verified).

## Workflow

1. **Load video** — any browser-playable format.
2. **Load transcript** — a JSON array of word timestamps:
   ```json
   [{ "text": "Imagine", "start": 0.07, "end": 0.42 }, { "text": "you", "start": 0.42, "end": 0.6 }]
   ```
   Words are auto-grouped into caption segments at sentence boundaries.
3. **Script (optional)** — upload a plaintext script whose own lines define the caption segments, overriding period-based splitting (timings still come from the transcript; words are aligned in order, so punctuation/case differences are fine).
4. **Design** — per segment: display mode (word / line / line + highlighted word), font (system, or upload .ttf/.otf/.woff), size, color, outline color & width, highlight color, and a bounding box you can drag/resize directly on the preview. The default style applies to new segments and can be pushed to all.
5. **Timeline** — the caption track sits above the video track. Drag blocks to move captions in time (their words move with them), drag the edges to trim, shift+click to select several and combine them. Snap to word edges; hold Alt for fine control. Ctrl+wheel zooms. Space plays/pauses, ←/→ nudge, Delete removes the selection.
6. **Export MP4** — the editor resolves every line break and position in the browser, the local server burns them in with ffmpeg/libass (single pass) and reports progress.

Projects save/load as `.captioner.json` files (fonts embedded; re-open the video file after loading).

## Development

```powershell
npm test             # shared algorithm unit tests (vitest)
npm run typecheck    # all workspaces
npm run build        # client production build
npm run verify:export # e2e: renders the 8s test video with all modes + custom font, verifies with ffprobe
```

`verify:export` needs `npm run dev` running and creates its own assets in `test-assets/` (a testsrc2 video and Bebas Neue are generated/downloaded on first run). Set `SMOKE_VIDEO=<path>` to run the same spec against another file (e.g. a no-audio copy).

## Architecture

npm workspaces:

- **`shared/`** — the domain model and pure algorithms, DOM-free and unit-tested: greedy word wrapping, script/transcript alignment (DP edit distance), sentence segmentation, display-event resolution, and the ASS generator. Both the preview and the export render from the same `DisplayEvent[]` list, so what you see is what gets burned in.
- **`client/`** — React + Vite + Zustand editor. Preview is a DOM overlay over the `<video>` scaled to video pixels; wrapping uses canvas `measureText` (same text engine as the preview); a rAF loop drives word-level playback sync.
- **`server/`** — Express + multer + ffmpeg. `POST /api/render` takes the resolved spec + video, generates the ASS (libass `ass` filter, `fontsdir` for uploaded fonts), streams progress, and serves the MP4.

### Renderer seam

Export goes through a `Renderer` interface (`server/src/lib/renderers/types.ts`). v1 is the libass renderer; a headless-Chrome PNG-overlay renderer (pixel-perfect by construction) can be registered without API changes. Likewise, script alignment goes through `WordAligner` (`shared/src/alignment.ts`) — the installed ffmpeg build even ships a native `whisper` filter, so a Whisper-based forced aligner (script-only import, no JSON) can be added later without touching callers.
