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

## 5. Carousel images

The hero cycles through every image in **`client/src/assets/carousel/`**. Create
the folder and drop files in — there is no list to maintain:

```
client/src/assets/carousel/
  01-word-by-word.webp
  02-line-by-line.webp
  03-highlight-mode.webp
```

- **Order is the filename**, sorted alphabetically — hence the numeric prefixes.
- **The filename becomes the alt text** for screen readers:
  `01-word-by-word.webp` → "Word by word". Name the files descriptively and
  accessibility comes for free.
- **Formats**: `.webp`, `.png`, `.jpg`, `.jpeg`, `.avif`. WebP is the best size
  for the quality.
- **Size**: aim for roughly 700×1200 (portrait, 9:15) and under ~200 KB each.
  Anything that is not that shape is letterboxed rather than cropped.
- **Until the folder has images**, the hero shows the CSS illustration that
  shipped with the page, so nothing is ever broken or blank.

Only the first image loads eagerly; the rest load lazily. The carousel pauses on
hover, on keyboard focus, and in a background tab, and does not auto-advance at
all for anyone whose system asks for reduced motion.

## 6. Deploy

```powershell
npm run build     # → client/dist
npm start         # Express serves client/dist on PORT (default 3001)
```

Deep links work: `server/src/app.ts` falls back to `index.html` for any path that
is not `/api/`.

For AdSense, follow the four steps in the README's "Ad rail" section — the loader
snippet goes in `client/index.html`, where a placeholder comment is waiting.

### Two things that are not done

**Prerendering.** AdSense's review crawler does not reliably run JavaScript, so it
sees an empty `<div id="root"></div>` no matter how much copy the page has. The
landing page is currently a strong SEO asset for Google and a blank page to that
crawler. The fix is a prerender pass over the built `dist/`, rendering each route
to static HTML.

Note for whoever does it: `client/src/site/carousel.ts` uses `import.meta.glob`,
which is a Vite build-time macro. A prerender step therefore has to run through
Vite (an SSR build), not a standalone `tsx` script.

**"No upload" is true by default, not always.** The in-browser renderer is the
default path and nothing leaves the machine. But
`client/src/components/ExportDialog.tsx` falls back to uploading the video to the
server if that renderer fails to start, and nothing in `server/` deletes job
directories afterwards. The site's copy and the privacy policy both disclose
this. Requiring a click for that fallback, and deleting job directories after
download, would make the claim unconditional.

---

## Catch-all

```powershell
grep -rn "\[Product Name\]\|example\.\|hello@" client/
```

Anything that shows up is a placeholder that still needs a real value.
