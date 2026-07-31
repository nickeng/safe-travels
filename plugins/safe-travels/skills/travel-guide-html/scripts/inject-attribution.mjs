#!/usr/bin/env node
/**
 * inject-attribution.mjs — Merge attribution metadata into a guide.html
 *
 * Reads attribution-*.json files from a directory, joins on image URL with the guide,
 * and injects a const ATTRIBUTION = {...} object between markers. Optionally fetches
 * Wikimedia Commons metadata for any upload.wikimedia.org URLs not already attributed.
 *
 * Usage: node inject-attribution.mjs <guide.html> [--dir <path>] [--no-wikimedia]
 *   --dir         Directory to glob attribution-*.json from (default: ./research/)
 *   --no-wikimedia  Skip Wikimedia Commons API lookups
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const args = process.argv.slice(2);
const guideFile = args.find(a => !a.startsWith('--'));
if (!guideFile) { console.error('Usage: node inject-attribution.mjs <guide.html> [--dir path] [--no-wikimedia]'); process.exit(1); }

const flag = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const dir = resolve(flag('--dir', './research'));
const skipWiki = args.includes('--no-wikimedia');

// 1. Load and merge all attribution-*.json files
const attrFiles = readdirSync(dir).filter(f => f.startsWith('attribution-') && f.endsWith('.json'));
const merged = new Map();
for (const f of attrFiles) {
  try {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
    if (Array.isArray(data)) {
      for (const e of data) { if (e.url) merged.set(e.url, e); }
    } else if (data.images) {
      for (const img of data.images) {
        if (img.url) merged.set(img.url, { siteName: data.siteName, sourcePage: img.sourcePage || data.sourcePage, credit: img.credit || null, license: img.license || null, licenseUrl: img.licenseUrl || null, ...img });
      }
    }
  } catch (err) { console.error(`  Skipping ${f}: ${err.message}`); }
}

// 2. Read guide and extract all image URLs.
// Image URLs live in the <script type="application/json" id="guide-data"> block as
// items[].images[].url (plus any <img src>). Sources (items[].sources[].url) are NOT
// images and must not be attributed as such, so we select images structurally.
let html = readFileSync(guideFile, 'utf-8');
let itemsUrls = [];
const dataMatch = html.match(/<script type="application\/json" id="guide-data">([\s\S]*?)<\/script>/);
if (dataMatch) {
  try {
    const parsed = JSON.parse(dataMatch[1]);
    const items = Array.isArray(parsed) ? parsed : (parsed.items || []);
    for (const it of items) for (const im of (it && it.images) || []) if (im && im.url) itemsUrls.push(im.url);
    // Seasonal guides: per-season hero images live in the top-level `heroes` key.
    const heroes = Array.isArray(parsed) ? {} : (parsed.heroes || {});
    for (const h of Object.values(heroes)) if (h && h.img) itemsUrls.push(h.img);
  } catch (e) { console.error(`  guide-data JSON invalid — ${e.message}`); }
} else {
  console.error('  No <script type="application/json" id="guide-data"> block found — no item images to attribute');
}
// Rendered-image URLs from the markup: <img src> (editorial images) and data-src (the hero credit
// span). Deliberately NOT a bare src= scan — that would also sweep in <script src>/<link> CDN URLs
// (and previously matched data-src only by substring accident).
const srcUrls = [
  ...[...html.matchAll(/<img\b[^>]*\ssrc="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
  ...[...html.matchAll(/\bdata-src="(https?:\/\/[^"]+)"/g)].map(m => m[1]),
];
const allUrls = [...new Set([...itemsUrls, ...srcUrls])];

// 3. Wikimedia Commons detection + API fetch
// Thumbnail: /commons/thumb/a/ab/File.jpg/1280px-File.jpg → extract "File.jpg" (before /NNNpx-)
// Direct:    /commons/a/ab/File.jpg → extract "File.jpg"
const WIKI_RE = /upload\.wikimedia\.org\/wikipedia\/commons\//;
function wikiFilename(url) {
  const m = url.match(/\/commons\/thumb\/[a-f0-9]\/[a-f0-9]{2}\/([^/]+)\/\d+px-/);
  if (m) return decodeURIComponent(m[1]);
  const d = url.match(/\/commons\/[a-f0-9]\/[a-f0-9]{2}\/([^/?]+)$/);
  return d ? decodeURIComponent(d[1]) : null;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchCommonsMetadata(filename) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(filename)}&prop=imageinfo&iiprop=extmetadata&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'travel-guide-attribution/1.0 (attribution script)' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  const meta = page?.imageinfo?.[0]?.extmetadata;
  if (!meta) return null;
  const artist = (meta.Artist?.value || '').replace(/<[^>]+>/g, '').trim();
  const license = meta.LicenseShortName?.value || null;
  const licenseUrl = meta.LicenseUrl?.value || null;
  return { siteName: "Wikimedia Commons", credit: artist || null, license, licenseUrl, sourcePage: `https://commons.wikimedia.org/wiki/File:${filename}` };
}

if (!skipWiki) {
  const wikiUrls = allUrls.filter(u => WIKI_RE.test(u) && !merged.has(u));
  if (wikiUrls.length) {
    console.log(`  Fetching Wikimedia metadata for ${wikiUrls.length} image(s)...`);
    for (const u of wikiUrls) {
      const filename = wikiFilename(u);
      if (!filename) continue;
      try {
        const meta = await fetchCommonsMetadata(filename);
        if (meta) merged.set(u, { url: u, ...meta });
      } catch {}
      await sleep(1000);
    }
  }
}

// 4. Build ATTRIBUTION object (only URLs present in the guide)
const attribution = {};
let ccCount = 0, editorialCount = 0;
for (const url of allUrls) {
  const entry = merged.get(url);
  if (entry) {
    attribution[url] = {
      siteName: entry.siteName || null,
      credit: entry.credit || null,
      license: entry.license || null,
      licenseUrl: entry.licenseUrl || null,
      sourcePage: entry.sourcePage || null
    };
    if (entry.license) ccCount++; else editorialCount++;
  }
}

// 5. Inject into guide.html — replace the inner text of the #attribution-data JSON island
const json = JSON.stringify(attribution, null, 2);
const ISLAND_RE = /(<script type="application\/json" id="attribution-data">)[\s\S]*?(<\/script>)/;

if (ISLAND_RE.test(html)) {
  html = html.replace(ISLAND_RE, (_, open, close) => `${open}${json}${close}`);
} else {
  console.error('  No <script type="application/json" id="attribution-data"> island found — cannot inject attribution'); process.exit(1);
}

writeFileSync(guideFile, html);
const total = Object.keys(attribution).length;
console.log(`  Attribution injected: ${total} images (${ccCount} CC-licensed, ${editorialCount} editorial)`);
if (!attrFiles.length && !total) console.log('  No attribution-*.json files found — ATTRIBUTION is empty');
