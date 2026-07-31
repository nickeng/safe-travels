---
name: extract-page-media
description: Extract content and media for page using a headless browser.
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Extract Page Media

Run this on a source page to pull image URLs and map coordinates that `web_fetch` can't give you
(it drops `<img>` src and never returns coordinates). Use it as a **second pass over a shortlist of
source URLs you already found — one render per page, not on every search hit.** The default output
is a markdown layout of the page in document order that places each image next to its surrounding
headings/prose; read it to decide which text describes each photo, then copy that image's URL
verbatim from the manifest.

## Command

```bash
node ${CLAUDE_SKILL_DIR}/scripts/extract-images.mjs "https://blog.example.com/destination-photo-spots"

# Also save image attribution metadata
node ${CLAUDE_SKILL_DIR}/scripts/extract-images.mjs --url "<url>" --attribution research/

# Structured JSON instead of markdown (programmatic use)
node ${CLAUDE_SKILL_DIR}/scripts/extract-images.mjs "<url>" --json
```

Public web only (no auth). Self-bootstraps Playwright + chromium on first run.

## Output (default: markdown)

The page linearized in document order, with each image shown where it sits between the surrounding
headings and prose. Each image marker carries its verbatim `url=` so you copy it in place.
Boilerplate/nav is removed and prose far from any marker is dropped (marker-free sections collapse to
heading-only) to keep it compact. Map links appear inline as `«MAP [lat,lng]»` markers next to the place they describe.

```
# Page media — https://blog.example.com/colmar-photo-spots
Site: Example Travel · Author: Jane Doe

> Images appear in document order as «IMG <id> · filename≈"…" · alt="…" · figcaption="…" · url=<URL>». ...

## Petite Venise
Arrive before 8am to shoot the half-timbered houses mirrored in the Lauch...
«IMG 3 · filename≈"petite venise dawn" · alt="Petite Venise at first light" · figcaption="(none)" · url=https://images.example.com/petite-venise-dawn.jpg»
«MAP [48.0740,7.3573]»
```

Add `--json` for a structured object (`{ url, counts, images:[{id,url,alt,figcaption,w,h,type}],
geoLinks:[{raw,resolved,coords,text,section}], siteName, author }`) when you need to parse it
programmatically.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--wait <ms>` | `4000` | Extra wait after auto-scroll for lazy content (raise for heavy pages) |
| `--min-width <px>` | `400` | Drop images narrower than this (logos/icons) |
| `--attribution <dir>` | off | Write image attribution metadata (credit, source page) to a JSON file in `<dir>` |
| `--json` | off | Emit the structured object instead of markdown |

## Reading the output

The page is shown in document order, so each image sits between the headings and prose around it.

- **`«IMG <id> · filename≈"…" · alt="…" · figcaption="…" · url=…»`** — one image at its position.
  `filename≈` is the humanized slug; `"(generic camera/cms name)"` means it's uninformative
  (e.g. `DSC0001`, `untitled_…`).
- **`url=`** — the real image URL, on the marker. Copy it exactly; never retype or pad a filename
  (a reconstructed URL 404s).
- **`«MAP [lat,lng]»`** — a map-link anchor, inline at its position next to the place.
  `[lat,lng]` is parsed/resolved; `«MAP (no coords)»` when coordinates couldn't be parsed.
- Skip **non-content** images (logos, hero/title banners, related-post thumbnails, author photos,
  ebook covers, pins, social-feed embeds) — they appear in the layout but aren't tied to a spot.

## Choosing which place an image belongs to

Decide what the photo shows, then which item it belongs to, using this evidence in order
(strongest first):

1. **figcaption** — written for that exact image; it decides.
2. **alt** — when it names a specific subject. A generic article/site-wide alt (a blog-post blurb,
   "<City> in <Month>…") or a social-feed caption is NOT evidence — skip it.
3. **`filename≈`** — when the slug names the place. `"(generic camera/cms name)"` is uninformative;
   ignore it and use the other signals.
4. **the heading the image sits under** — the default when 1–3 are silent. Most images belong to the
   heading directly above them.
5. **adjacent prose** — ONLY a sentence immediately beside the image, and ONLY when 1–4 give no
   subject. Never take a place from a paragraph far from the image.

**A naming caption/alt/filename overrides heading position.** Images are sometimes placed as a
lead-in just *above* the heading of the place they depict, so when an image's own caption names a
different place than the heading above it, trust the caption. Example: an image captioned
"…Place B" sitting under `## Place A` immediately above `## Place B` belongs to **Place B**.

## Gotchas

- **A scraped URL is not a reuse right.** Capture `credit`; prefer link + attribution over
  re-hosting.
- **Hotlink/403:** the URL is correct, but embedding it later may 403 — re-host or link out.
- **Cost:** one headless render per page. Run only on a shortlist of source URLs.
- **Politeness:** one fetch per page; respect site robots/ToS and rate-limit batches.
- **Invoke it plainly** — no extra shell redirection or exit-code echoing (`2>file; echo $?`); it
  breaks permission auto-approval.

