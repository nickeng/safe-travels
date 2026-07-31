#!/usr/bin/env node
/**
 * Extract photo-spot media from a travel blog page (public web).
 * Renders the page (triggers lazy-load), then in ONE pass returns a clean,
 * LINEARIZED markdown view of the page so an agent can associate each image
 * with the text that describes it:
 *   - document-order headings + prose (boilerplate/nav removed, prose far from
 *     any image dropped to save tokens)
 *   - one image marker per image, carrying a humanized filename + alt + figcaption
 *     + its verbatim url= (inline, so it survives output truncation)
 *   - inline «MAP [lat,lng]» markers at each map-link anchor, emitted in document
 *     order right next to the place they describe (coords parsed/resolved; «MAP
 *     (no coords)» when none could be parsed)
 *
 * Coords are scraped/parsed deterministically (regex over hrefs) — never guessed.
 * Content inside <form> (subscribe/search/comment widgets) is dropped as non-article.
 *
 * Usage: node extract-images.mjs <url> [--wait <ms>] [--min-width <px>] [--json]
 *        [--attribution <dir>]
 *   default : markdown (agent-facing association view)
 *   --json  : structured { images, geoLinks, ... } for programmatic use
 */
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(__dirname, 'node_modules', 'playwright'))) {
  console.error('Installing playwright (first run)...');
  execSync('npm install && npx playwright install chromium', { cwd: __dirname, stdio: 'inherit' });
}
const { chromium } = await import('playwright');

const args = process.argv.slice(2);
const url = args.find(a => a.startsWith('http'));
if (!url) { console.error('Usage: node extract-images.mjs <url> [--wait <ms>] [--min-width <px>] [--json] [--attribution <dir>]'); process.exit(1); }
const getArg = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d; };
const waitMs = parseInt(getArg('--wait', '4000'), 10);
const minWidth = parseInt(getArg('--min-width', '400'), 10);
const jsonOut = args.includes('--json');
const attrPath = getArg('--attribution', null);

const NOISE = /logo|avatar|icon|sprite|pinterest|gravatar|emoji|badge|pixel|spacer|1x1/i;
// Stock-photo sources hotlinked directly (often watermarked previews).
const STOCK = /shutterstock|alamy|gettyimages|istockphoto|dreamstime|bigstock|123rf|depositphotos|adobestock|stock\.adobe|ftcdn\.net|fotolia/i;
const SHORT = /(goo\.gl\/maps|maps\.app\.goo\.gl|g\.page)/i;

// ---- text helpers (node side) ------------------------------------------
const NAV = /^(home|about|contact|destinations?|store|shop|photography|blog|menu|search|privacy|terms|legal notice|manage (options|services|consent)|no products|cart|sign in|log in|categories|tags|share|follow|skip to)/i;
const TAIL = /^(related (posts?|articles|guides)|more (from|guides)|comments?\b|subscribe\b|sign up\b|mailing list|leave a comment)/i;
const BOILER = /(share (this|on|to)|pin(terest)? it|on facebook|on twitter|tweet|whatsapp|subscribe|newsletter|related posts?|you (might|may) also|leave a (comment|reply)|read more|continue reading|^tags?:|posted (in|on)|filed under|comments? \(\d+\)|sign up|cookies?|privacy policy|©|all rights reserved|\bmin read\b|table of contents|advertisement|skip to content)/i;
const isBoiler = (s) => { const t = (s || '').trim(); if (!t) return true; if (BOILER.test(t)) return true; if (/^[\s|/>•·\-–—]+$/.test(t)) return true; if (/^\w+ \d{1,2}, \d{4}$/.test(t)) return true; return false; };
const navLike = (s) => NAV.test(s) || (s.split(/\s+/).length <= 2 && s.length < 16 && /^[A-Z]/.test(s));

// imgproxy/thumbor/Next.js-style CDNs hide the original URL (as a base64 path
// segment, or in a ?url=/?src= query param) — recover it so the filename
// reflects the real image, not the proxy hash/placeholder.
function origUrl(u) {
  // query-param proxies: ?url=/?src=/?image= an (encoded) source URL
  try {
    const q = new URL(u).searchParams;
    for (const k of ['url', 'src', 'image', 'imgurl', 'source', 'i']) {
      const v = q.get(k);
      if (v && /^https?:\/\//i.test(v) && /\.(jpe?g|png|webp|gif|avif)/i.test(v)) return v;
    }
  } catch { /* not a URL */ }
  // base64-embedded path segment (imgproxy/thumbor)
  for (const seg of u.split('?')[0].split('/').reverse()) {
    const s = seg.replace(/\.(jpe?g|png|webp|gif|avif)$/i, '');
    if (s.length < 24 || !/^[A-Za-z0-9_-]+={0,2}$/.test(s)) continue;
    try {
      const d = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      if (/^https?:\/\/\S+\.(jpe?g|png|webp|gif|avif)/i.test(d)) return d;
    } catch { /* not base64 */ }
  }
  return u;
}
function fileName(u) { return (origUrl(u).split('/').pop() || '').split('?')[0].replace(/\.(jpe?g|png|webp|gif|avif)$/i, ''); }
function humanFile(u) {
  let b = fileName(u).replace(/[-_+]/g, ' ')
    .replace(/\b\d{2,4}x\d{2,4}\b/g, ' ').replace(/\b\d{2,4}px\b/g, ' ').replace(/\bv\d+\b/gi, ' ')
    .replace(/\b\d{4} ?\d{2}? ?\d{2}?\b/g, ' ').replace(/\b[0-9a-f]{8,}\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
  if (!b || /^(untitled|img|dsc|dscf|pxl|screenshot|cropped|unsplash image|image|photo|final|edit)\b/i.test(b) || b.length < 4) return null;
  return b;
}

// Strip a site-wide alt-text template (a chunk of boilerplate repeated across most images,
// often with a per-image subject word before it and an inconsistently-appended suffix after
// it) — CMS/SEO plugins often splice the same blurb into every image's alt attribute, which
// isn't real evidence of what any one photo specifically shows. The shared chunk can land
// anywhere in the string, not just at the start or end, so this searches all positions.
function stripAltTemplates(imgBlocks) {
  const withAlt = imgBlocks.filter(b => b.alt);
  if (withAlt.length <= 10) return; // need >10 with alt before trusting a shared pattern
  const threshold = Math.max(6, Math.floor(withAlt.length / 2) + 1); // >5 AND >50%

  const alts = withAlt.map(b => b.alt);
  const maxLen = Math.max(...alts.map(s => s.length));
  let shared = null;
  for (let len = maxLen; len >= 20 && !shared; len--) {
    const owners = new Map(); // piece -> Set of alt INDICES containing it (dedupe by identity, not text)
    alts.forEach((s, i) => {
      for (let start = 0; start + len <= s.length; start++) {
        const piece = s.slice(start, start + len);
        if (!owners.has(piece)) owners.set(piece, new Set());
        owners.get(piece).add(i);
      }
    });
    for (const [piece, owned] of owners) {
      if (owned.size >= threshold) { shared = piece; break; }
    }
  }
  if (!shared) return;

  for (const b of withAlt) {
    if (!b.alt.includes(shared)) continue;
    const a = b.alt.replace(shared, ' ')
      .replace(/^\s*[|:\-–—]\s*/, '').replace(/\s*[|:\-–—]\s*$/, '')
      .replace(/\s+/g, ' ').trim();
    b.alt = a.length >= 4 ? a : null;
  }
}

function parseCoords(u) {
  const pats = [/@(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/, /!3d(-?\d+\.\d{3,})!4d(-?\d+\.\d{3,})/, /[?&](?:q|ll|destination)=(-?\d+\.\d{3,}),(-?\d+\.\d{3,})/];
  for (const p of pats) { const m = u.match(p); if (m) return { lat: +m[1], lng: +m[2] }; }
  return null;
}

const browser = await chromium.launch({ headless: true });
let out;
try {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' });
  const page = await ctx.newPage();
  // Some sites (ad-refresh scripts, e.g. pubmine) self-trigger a same-URL reload a
  // few seconds after load, destroying whatever execution context is mid-evaluate.
  // Retry once after a short wait rather than failing the whole extraction.
  const withRetry = async (fn) => {
    try { return await fn(); }
    catch (e) {
      if (!/Execution context was destroyed/.test(e.message)) throw e;
      await page.waitForTimeout(1000);
      return await fn();
    }
  };

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await withRetry(() => page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } }));
  await page.waitForTimeout(waitMs);

  const raw = await withRetry(() => page.evaluate(() => {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
    // Choose the best image URL: prefer the largest srcset candidate whose width
    // is <= MAX_SRCSET_W (deterministic + polite; avoids multi-MB originals and the
    // viewport/DPR-dependence of currentSrc). Fall back to currentSrc, then src.
    const MAX_SRCSET_W = 1600;
    const abs = (u) => { try { return new URL(u, location.href).href; } catch { return u; } };
    // Split a srcset into candidates WITHOUT breaking URLs that contain commas.
    // Many CDNs (Substack/Cloudinary/imgix) put comma-separated transforms in the
    // path, e.g. .../fetch/$s_!ab!,w_1456,c_limit,fl_progressive:steep/<encoded-url>.
    // A naive split(',') shatters those and yields mid-URL fragments that then
    // resolve relative to the page. Real srcset candidate separators are a comma
    // followed by whitespace, or a comma directly preceding the next URL token —
    // intra-URL transform commas are followed by non-space (w_/c_/f_/…), so they
    // are preserved.
    const splitSrcset = (ss) => ss.split(/,(?=\s|https?:\/\/|\/\/|data:)/).map(s => s.trim()).filter(Boolean);
    // A relative token that carries an encoded absolute URL (%2F/%3A) is a mangled
    // transform fragment, not a real image path — reject it as a backstop.
    const looksMangled = (raw) => !/^(https?:)?\/\//i.test(raw) && !raw.startsWith('/') && /%2f|%3a/i.test(raw);
    const chooseUrl = (img) => {
      const ss = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      if (ss) {
        const cands = splitSrcset(ss).map(part => {
          const sp = part.split(/\s+/); const d = sp[1] || '';
          if (looksMangled(sp[0])) return { u: null, w: 0 };
          return { u: abs(sp[0]), w: /^\d+w$/.test(d) ? parseInt(d) : (/^[\d.]+x$/.test(d) ? -parseFloat(d) : 0) };
        }).filter(c => c.u);
        const byW = cands.filter(c => c.w > 0);
        if (byW.length) { const under = byW.filter(c => c.w <= MAX_SRCSET_W); return (under.length ? under.sort((a, b) => b.w - a.w) : byW.sort((a, b) => a.w - b.w))[0].u; }
        const byX = cands.filter(c => c.w < 0).map(c => ({ u: c.u, x: -c.w }));
        if (byX.length) { const le2 = byX.filter(c => c.x <= 2); return (le2.length ? le2.sort((a, b) => b.x - a.x) : byX.sort((a, b) => a.x - b.x))[0].u; }
        if (cands.length) return cands[0].u;
      }
      return img.currentSrc || (img.src ? abs(img.src) : null);
    };
    // Largest width the image *advertises* via srcset width descriptors (0 if none).
    // Used for the size filter so responsive photos rendered small in a gallery column
    // (small naturalWidth) aren't discarded when a large original exists — the URL choice
    // above stays capped at the polite MAX_SRCSET_W; this only informs "is it a big image".
    const srcsetMaxW = (img) => {
      const ss = img.getAttribute('srcset') || img.getAttribute('data-srcset');
      if (!ss) return 0;
      let max = 0;
      for (const part of splitSrcset(ss)) {
        const d = (part.split(/\s+/)[1] || '');
        if (/^\d+w$/.test(d)) max = Math.max(max, parseInt(d, 10));
      }
      return max;
    };
    // ---- styled-header detection: many CMSes render section headers as styled
    //      text, not <h*> (e.g. Squarespace .sqsrte-large, Gutenberg presets, or
    //      just a larger/bolder <p>). Recover them so the "nearest heading" signal
    //      survives. Composite: prominence = sizeRatio + 0.20*boldFrac >= 1.35,
    //      or an explicit header class. Measured against the page's body baseline.
    const wOf = (el) => { const v = getComputedStyle(el).fontWeight; return v === 'normal' ? 400 : v === 'bold' ? 700 : (parseInt(v, 10) || 400); };
    const fsOf = (el) => parseFloat(getComputedStyle(el).fontSize) || 0;
    const med = (a) => { a = a.filter(Boolean).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : 0; };
    const medFS = med([...document.querySelectorAll('p')].map(fsOf)) || 16;
    const medW = med([...document.querySelectorAll('p')].map(wOf)) || 400;
    const HEADER_CLASS = /(^|\s)(sqsrte-large|has-large-font-size|has-x-large-font-size|has-huge-font-size)(\s|$)/;
    // fraction of an element's visible characters rendered bold (computed weight,
    // so it catches <strong>/<b> AND css-only bold) relative to the body baseline.
    const boldFrac = (el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let total = 0, bold = 0, n;
      while ((n = w.nextNode())) { const len = (n.textContent || '').trim().length; if (!len) continue; total += len; if (wOf(n.parentElement) >= medW + 200) bold += len; }
      return total ? bold / total : 0;
    };
    // returns a synthetic heading level (2-4) for a CSS-styled visual header, else null
    const styledLevel = (el) => {
      if (el.closest('nav,footer,header,aside')) return null;
      if (el.querySelector('img,ul,ol,figure,p,div')) return null;   // must be a standalone text line
      const t = clean(el.innerText); if (!t || t.length < 2 || t.length > 90) return null;
      const cls = HEADER_CLASS.test(el.className || '');
      const ratio = fsOf(el) / medFS;
      const prom = ratio + 0.20 * boldFrac(el);
      if (!cls && prom < 1.35) return null;
      const size = Math.max(ratio, cls ? 1.35 : 0);   // explicit class floors at h3 sizing
      return size >= 1.6 ? 2 : size >= 1.35 ? 3 : 4;
    };
    // Map anchors → coordinate markers, detected here so they can be emitted
    // INLINE in document order (next to the place) rather than in a trailing list.
    const MAP_HREF = /(google\.[a-z.]+\/maps|goo\.gl\/maps|maps\.app\.goo\.gl|g\.page)/i;
    // Real headings, EXCLUDING any inside a <form>: subscribe/search/comment widgets
    // (e.g. ConvertKit/formkit "N things you need to know" boxes) embed <h*> that
    // are not article structure and would pollute the "nearest heading" signal.
    const heads = [...document.querySelectorAll('h1,h2,h3')].filter(h => !h.closest('form'));
    const nearestHeading = (el) => { let h = null; for (const x of heads) { if (el.compareDocumentPosition(x) & Node.DOCUMENT_POSITION_PRECEDING) h = x; else break; } return h?.innerText?.trim() || null; };
    // Document-order blocks: headings, prose, images (figcaption carried on its
    // image), and map-link coordinate markers.
    const EMBED_HOSTS = [[/instagram\.com/i, 'instagram'], [/(youtube\.com|youtu\.be)/i, 'youtube'], [/tiktok\.com/i, 'tiktok'], [/(twitter\.com|x\.com)/i, 'twitter'], [/facebook\.com/i, 'facebook']];
    const seq = [...document.querySelectorAll('h1,h2,h3,h4,p,li,figcaption,blockquote,img,a[href],iframe')];
    const blocks = [];
    for (const el of seq) {
      // Skip anything inside a <form>: subscribe/search/comment widgets are never
      // article content — generic signal that drops injected CMS/marketing boxes.
      if (el.closest('form')) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === 'a') {
        if (MAP_HREF.test(el.href)) blocks.push({ type: 'geo', href: el.href, text: clean(el.innerText) || null, section: nearestHeading(el) });
      } else if (tag === 'iframe') {
        const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
        const m = EMBED_HOSTS.find(([re]) => re.test(src));
        if (m) blocks.push({ type: 'embed', provider: m[1] });
      } else if (tag === 'img') {
        blocks.push({ type: 'img', url: chooseUrl(el), alt: clean(el.alt) || null,
          figcaption: clean(el.closest('figure')?.querySelector('figcaption')?.innerText) || null,
          w: Math.max(el.naturalWidth || 0, srcsetMaxW(el)), h: el.naturalHeight });
      } else if (/^h[1-4]$/.test(tag)) {
        const t = clean(el.innerText); if (t) blocks.push({ type: 'h', level: +tag[1], text: t });
      } else if (tag === 'figcaption') { /* carried on the image */ }
      else {
        const t = clean(el.innerText); if (!(t && t.length >= 2)) continue;
        const lvl = (tag === 'p' || tag === 'li') ? styledLevel(el) : null;
        blocks.push(lvl ? { type: 'h', level: lvl, text: t } : { type: 'text', text: t });
      }
    }
    const siteName = document.querySelector('meta[property="og:site_name"]')?.content?.trim() || null;
    const author = document.querySelector('meta[name=author]')?.content?.trim() || null;
    return { blocks, siteName, author };
  }));

  // ---- filter blocks: assign image ids; resolve map-link coords inline ----
  const seen = new Set();           // dedupe image urls
  const geoSeen = new Set();        // dedupe map hrefs (first doc-order occurrence wins)
  let id = 0;
  const blocks = [];
  const geoLinks = [];
  for (const b of raw.blocks) {
    if (b.type === 'img') {
      if (!b.url || b.url.startsWith('data:') || b.w < minWidth || NOISE.test(b.url) || STOCK.test(b.url) || seen.has(b.url)) continue;
      seen.add(b.url);
      blocks.push({ ...b, id: id++, type: 'img' });
    } else if (b.type === 'geo') {
      if (geoSeen.has(b.href)) continue;
      geoSeen.add(b.href);
      let resolved = null, coords = parseCoords(b.href);
      if (!coords && SHORT.test(b.href)) {
        try { const r = await ctx.request.get(b.href, { maxRedirects: 8, timeout: 15000 }); resolved = r.url(); coords = parseCoords(resolved); } catch {}
      }
      const geo = { type: 'geo', href: b.href, resolved, coords: coords || null, text: b.text, section: b.section };
      blocks.push(geo);
      geoLinks.push({ raw: b.href, resolved, coords: coords || null, text: b.text, section: b.section });
    } else {
      blocks.push(b);
    }
  }
  stripAltTemplates(blocks.filter(b => b.type === 'img'));
  const images = blocks.filter(b => b.type === 'img').map(b => ({
    id: b.id, url: b.url, alt: b.alt, figcaption: b.figcaption, w: b.w, h: b.h,
    type: /map/i.test(`${b.alt} ${b.url}`) ? 'map' : 'spot',
  }));

  out = { url, blocks, counts: { images: images.length, geoLinks: geoLinks.length, withCoords: geoLinks.filter(g => g.coords).length }, images, geoLinks, siteName: raw.siteName, author: raw.author };
} finally { await browser.close(); }

// ---- build the markdown association view ----
function buildMarkdown(o) {
  const b = o.blocks;
  // start at the article title: prefer the first <h1>; else the first non-nav heading.
  let start = b.findIndex(x => x.type === 'h' && x.level === 1 && x.text.length > 6 && !NAV.test(x.text));
  if (start < 0) start = b.findIndex(x => x.type === 'h' && x.text.length > 6 && !NAV.test(x.text));
  if (start < 0) start = 0;
  // A hero photo often sits immediately before the title — include it (pull start
  // back over one leading image) so it isn't dropped now that there's no manifest.
  if (start > 0 && b[start - 1] && b[start - 1].type === 'img') start -= 1;
  let end = b.length;
  for (let i = start + 1; i < b.length; i++) { if (b[i].type === 'h' && TAIL.test(b[i].text) && i > start + 0.6 * (b.length - start)) { end = i; break; } }
  const win = b.slice(start, end);
  // Anchors = images + map markers; both are always kept. Prose is kept only when
  // near an anchor (trims tokens while keeping captions/addresses in context).
  const anchorPos = win.map((x, i) => (x.type === 'img' || x.type === 'geo') ? i : -1).filter(i => i >= 0);
  const nearAnchor = (i) => anchorPos.some(p => Math.abs(p - i) <= 3);

  const lines = [];
  win.forEach((x, i) => {
    if (x.type === 'h') { lines.push(`\n${'#'.repeat(x.level)} ${x.text}`); return; }
    if (x.type === 'embed') { lines.push(`«EMBED ${x.provider}»`); return; }
    if (x.type === 'text') { if (isBoiler(x.text) || navLike(x.text) || !nearAnchor(i)) return; lines.push(x.text.slice(0, 280)); return; }
    if (x.type === 'geo') {
      lines.push(x.coords ? `«MAP [${x.coords.lat},${x.coords.lng}]»` : `«MAP (no coords)»`);
      return;
    }
    if (x.type === 'img') {
      const human = humanFile(x.url);
      lines.push(`«IMG ${x.id} · filename≈"${human || '(generic camera/cms name)'}" · alt="${x.alt || '(none)'}" · figcaption="${x.figcaption || '(none)'}" · url=${x.url}»`);
    }
  });
  let md = '';
  const meta = [o.siteName && `Site: ${o.siteName}`, o.author && `Author: ${o.author}`].filter(Boolean).join(' · ');
  md += `# Page media — ${o.url}\n`;
  if (meta) md += `${meta}\n`;
  md += `\n> Images appear in document order as «IMG <id> · filename≈"…" · alt="…" · figcaption="…" · url=<URL>». ` +
        `filename≈ is the file slug humanized; "(generic camera/cms name)" means it is uninformative — rely on alt/figcaption/surrounding prose instead. ` +
        `A caption may sit immediately above OR below an image. Prose far from any marker and boilerplate/nav were removed; marker-free sections show as heading-only. ` +
        `Map links appear inline in document order as «MAP [lat,lng]» next to the place they describe. ` +
        `«EMBED <provider>» marks an embedded social post (e.g. an Instagram photo) whose image can't be extracted — the spot's photo is there but unusable, so that spot has no usable image (don't substitute another). ` +
        `The url field on an image marker is verbatim — copy it exactly (never retype/pad a filename, it will 404).\n`;
  md += lines.join('\n').replace(/\n{3,}/g, '\n\n');
  return md + '\n';
}

if (jsonOut) {
  const { blocks, ...rest } = out;             // blocks are an internal detail
  console.log(JSON.stringify(rest, null, 2));
} else {
  console.log(buildMarkdown(out));
}

// Write attribution JSON if --attribution specified
if (attrPath && out) {
  const data = { siteName: out.siteName || out.author || null, sourcePage: url, images: out.images.map(img => ({ url: img.url })) };
  const dir = attrPath.replace(/\/?$/, '/');
  mkdirSync(dir, { recursive: true });
  const file = `${dir}attribution-media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
  writeFileSync(file, JSON.stringify(data, null, 2));
}
