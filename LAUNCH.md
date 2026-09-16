# Before you launch

Everything on the marketing site that ships as a placeholder, where to change it,
and the two things that are deliberately not done yet.

`README.md` covers how the **app** works. This covers what to do to the **site**
before it goes on a real domain.

---

## 1. The product name

Set it once:

```ts
// client/src/site/config.ts
name: '[Product Name]',
```

That one value drives the header logo, the footer, every page `<title>`, the
structured data, and the comparison table heading. Nothing in `client/src/pages/`
or `client/src/site/` hardcodes a name — that is checked by
`grep -rn "Captioner" client/src/pages client/src/site` (which should return
nothing).

**It is not enough on its own.** `client/index.html` carries the name again in its
static `<title>`, `og:*` and `twitter:*` tags. Search crawlers and social
scrapers read those, and they do not run JavaScript — so they can never pick up
the config value. Edit them there by hand.

## 2. Legal and contact details

All in `client/src/site/config.ts`:

| Field | Where it shows up |
|---|---|
| `contactEmail` | Contact page button, privacy and terms footers, the site footer |
| `companyName` | Terms ("operated by …"), the footer copyright |
| `jurisdiction` | Terms section 9, governing law |
| `siteOrigin` | Runtime canonical URLs, and the sitemap base |
| `effectiveDate` | "Last updated" on both legal pages |

The prose itself lives in `client/src/pages/Privacy.tsx`, `Terms.tsx` and
`Contact.tsx` as ordinary JSX if you want to reword it.

> **These are templates, not legal advice.** They were written to describe what
> the software actually does, but nobody qualified has read them. The liability
> and governing-law clauses are the ones to have checked.

## 3. The domain

Three files carry it, and none of them can read the config:

- `client/index.html` — the `og:url` tag
- `client/public/sitemap.xml` — every `<loc>`, plus the `lastmod` dates
- `client/public/robots.txt` — the `Sitemap:` line

## 4. Colours

`client/src/index.css:6-19` is the brand block. Change `--accent` there and the
editor **and** the whole marketing site follow, because
`client/src/site.css:34-59` derives its tokens from those values.

`client/public/favicon.svg` is the one exception — it has hex values baked in,
because an SVG file cannot read a CSS variable. Update it by hand if you recolour.

## 5. The hero image

One image, on the landing page. Two files are involved:

| What | Where |
|---|---|
| The picture | `client/src/assets/hero.webp` |
| The path and the alt text | `heroImage` in `client/src/site/config.ts` |

**To change the picture, replace the file.** Keep the name `hero.webp` and
nothing else has to move — `config.ts` imports it, so Vite fingerprints the new
bytes and no cache needs clearing. To use a different filename or format
(`.png`, `.jpg`, `.jpeg`, `.avif` all work), point the import at the top of
`config.ts` at it. To use an image hosted somewhere else, drop that import and
put the URL straight into `src`.

- **Alt text** is the one string to edit in `config.ts`. It is what a screen
  reader reads in place of the picture, so describe what the image shows rather
  than repeating the heading above it.
- **Size**: aim for 700×1200 (portrait, 9:15) and under ~200 KB. At exactly that
  shape the image fills the frame edge to edge; anything else is letterboxed
  against the frame's own background rather than cropped.
- **Weight matters more here than anywhere else on the site.** It sits above the
  fold and loads eagerly at high priority, so it is almost certainly the page's
  LCP element.

Until you replace it, the file is a placeholder that prints its own dimensions in
the hero.

## 6. Deploy

Target is **Cloudflare Pages**, static and Git-connected:

| Setting | Value |
|---|---|
| Root directory | the repo root — `client` resolves `@captioner/shared: "*"` through the workspace |
| Build command | `npm run build` |
| Output directory | `client/dist` |
| `NODE_VERSION` | `22` — nothing pins it, so the build otherwise tracks Cloudflare's default |

Deep links work through `client/public/_redirects`, which names the app's routes
explicitly. It is deliberately **not** a `/*` catch-all: Cloudflare's docs say
redirects are followed even when a static asset matches, so a catch-all would
rewrite `/assets/*.js` to HTML and break the app with a MIME-type error.

**25 MiB is a hard per-file ceiling.** Pages refuses any single asset over it,
which is why the ffmpeg core is fetched from jsDelivr instead of built into
`dist/` — its wasm is 30.74 MiB. `client/vite.config.ts` copies only ffmpeg's
worker; adding the core back will make the deploy fail. The onnxruntime assets
stay self-hosted, because ORT builds its threading workers from cross-origin URLs
that browsers refuse to construct. Note `ort-wasm-simd-threaded.jsep.wasm` sits at
24.89 MiB, 0.11 MiB under the ceiling — check it after any dependency bump.

**The server is not deployed**, so `/api/*` does not exist and the faster
server-side render can never run. The site's copy is written for that. `npm start`
still serves `client/dist` from Express wherever Node is available.

For AdSense, follow the four steps in the README's "Ad rail" section — the loader
snippet goes in `client/index.html`, where a placeholder comment is waiting.

### Two things that are not done

**Prerendering.** AdSense's review crawler does not reliably run JavaScript, so it
sees an empty `<div id="root"></div>` no matter how much copy the page has. The
landing page is currently a strong SEO asset for Google and a blank page to that
crawler. The fix is a prerender pass over the built `dist/`, rendering each route
to static HTML.

Note for whoever does it: `client/src/site/config.ts` pulls the hero image in
through Vite (`import heroImage from '../assets/hero.webp'`), and that only
resolves inside a Vite build. A prerender step therefore has to run through Vite
(an SSR build), not a standalone `tsx` script.

**"No upload" holds because the server is not deployed.** With no `/api`, the
health check fails, the server render is never offered, and the silent upload
fallback in `client/src/components/ExportDialog.tsx` cannot fire — the claim is
unconditional by construction. Put `server/` behind the same domain and that
stops being true: the fallback uploads without asking, and nothing in `server/`
deletes job directories afterwards. Requiring a click for the fallback, and
deleting job directories after download, would make the claim hold either way.

---

## Catch-all

```powershell
grep -rn "\[Product Name\]\|example\.\|hello@" client/
```

Anything that shows up is a placeholder that still needs a real value.
