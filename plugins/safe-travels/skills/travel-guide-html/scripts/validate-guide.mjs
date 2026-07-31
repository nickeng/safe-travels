#!/usr/bin/env node
// validate-guide.mjs — run on a guide.html to catch common issues (with line numbers)
// Usage: node validate-guide.mjs guide.html

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Self-install deps if missing (acorn = JS AST; node-html-parser = DOM for structural checks)
const __dirname = dirname(fileURLToPath(import.meta.url));
for (const dep of ['acorn', 'node-html-parser']) {
  if (!existsSync(join(__dirname, 'node_modules', dep))) {
    console.error(`Installing ${dep} (first run)...`);
    execSync(`npm install ${dep}`, { cwd: __dirname, stdio: 'inherit' });
  }
}
const acorn = await import('acorn');
const { parse: parseHTML } = await import('node-html-parser');

const file = process.argv[2];
if (!file) { console.error('Usage: node validate-guide.mjs <guide.html>'); process.exit(1); }

const html = readFileSync(file, 'utf-8');
const errors = [];
const warnings = [];

// --- Line-number helpers ---
// Precompute line start offsets for O(log n) index→line lookup
const lineOffsets = [0];
for (let i = 0; i < html.length; i++) {
  if (html[i] === '\n') lineOffsets.push(i + 1);
}
function lineOf(index) {
  let lo = 0, hi = lineOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineOffsets[mid] <= index) lo = mid; else hi = mid - 1;
  }
  return lo + 1; // 1-based
}

// --- DOM parse (node-html-parser) for structural checks ---
// Structural checks (module/data/img discovery, mounts, nesting, duplicate id) use a real parsed
// tree instead of regex. Integrity guards (§2 tag balance, §3 script/html termination) intentionally
// stay pre-parse and text-based — a lenient parser auto-repairs broken markup and would mask exactly
// those failures. Comments are retained so querySelector never matches inside them (instructional
// data-section examples in comments must not count).
const root = parseHTML(html, { comment: true });
// Map a DOM node to a source line. node-html-parser sets `range=[start,end]` on nodes; fall back to
// locating the node's markup if a range is ever absent, so line reporting never regresses.
function nodeLine(node) {
  if (node && Array.isArray(node.range)) return lineOf(node.range[0]);
  if (node && typeof node.outerHTML === 'string') {
    const i = html.indexOf(node.outerHTML.slice(0, 40));
    if (i >= 0) return lineOf(i);
  }
  return 0;
}
// Offset of an element's inner content (just past its open tag) — for content-relative line math
// (JS errors, JSON URL lookups). Safe because module/data <script> open tags carry no '>' in attrs.
function innerStart(node) {
  return node && Array.isArray(node.range) ? html.indexOf('>', node.range[0]) + 1 : 0;
}

// --- 1. JS: find ALL module blocks; assert exactly one; syntax-check each ---
const moduleEls = root.querySelectorAll('script[type="module"]');
const moduleBlocks = moduleEls.map(el => ({ body: el.rawText, startLine: lineOf(innerStart(el)) }));
// Kept for later checks (section 9 map-wiring) — the first module block's body + start line
const firstModuleBody = moduleEls.length ? moduleEls[0].rawText : null;
let scriptStartLine = moduleBlocks.length ? moduleBlocks[0].startLine : 0;

if (moduleBlocks.length === 0) {
  errors.push('No <script type="module"> found');
} else if (moduleBlocks.length > 1) {
  errors.push(`Lines ${moduleBlocks.map(b => b.startLine).join(', ')}: ${moduleBlocks.length} <script type="module"> blocks found — the guide must be ONE module. Top-level declarations (e.g. render(), activeSeason, CARD_VARIANTS) in one module are NOT visible to another, so cross-module references throw "X is not defined" at runtime. Merge them into a single <script type="module">.`);
}

// Acorn syntax + brace/bracket balance + duplicate-close, on EVERY module block
for (const { body: script, startLine: blockStart } of moduleBlocks) {
  // Acorn parse for precise syntax errors
  try {
    acorn.parse(script, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (e) {
    const loc = e.loc;
    if (loc) {
      errors.push(`Line ${blockStart + loc.line - 1}, col ${loc.column}: JS syntax error — ${e.message}`);
    } else {
      errors.push(`JS syntax error: ${e.message}`);
    }
  }

  // Supplemental brace/bracket balance (catches issues acorn might accept or gives a count)
  let braces = 0, brackets = 0;
  let firstUnbalancedBrace = null, firstUnbalancedBracket = null;
  const scriptLines = script.split('\n');
  for (let i = 0; i < scriptLines.length; i++) {
    for (const ch of scriptLines[i]) {
      if (ch === '{') { if (braces === 0 && firstUnbalancedBrace === null) firstUnbalancedBrace = i; braces++; }
      if (ch === '}') { braces--; if (braces < 0 && firstUnbalancedBrace === null) firstUnbalancedBrace = i; }
      if (ch === '[') { if (brackets === 0 && firstUnbalancedBracket === null) firstUnbalancedBracket = i; brackets++; }
      if (ch === ']') { brackets--; if (brackets < 0 && firstUnbalancedBracket === null) firstUnbalancedBracket = i; }
    }
  }
  if (braces !== 0) {
    const where = firstUnbalancedBrace !== null ? ` (near line ${blockStart + firstUnbalancedBrace})` : '';
    warnings.push(`Line ${blockStart + (firstUnbalancedBrace || 0)}: JS brace imbalance: ${braces > 0 ? braces + ' unclosed {' : Math.abs(braces) + ' extra }'}${where}`);
  }
  if (brackets !== 0) {
    const where = firstUnbalancedBracket !== null ? ` (near line ${blockStart + firstUnbalancedBracket})` : '';
    warnings.push(`Line ${blockStart + (firstUnbalancedBracket || 0)}: JS bracket imbalance: ${brackets > 0 ? brackets + ' unclosed [' : Math.abs(brackets) + ' extra ]'}${where}`);
  }

  // Duplicate ];]; pattern
  const dupIdx = script.indexOf('];\n];');
  if (dupIdx !== -1) {
    const dLine = blockStart + script.slice(0, dupIdx).split('\n').length - 1;
    errors.push(`Line ${dLine}: Duplicate ]; found (array closed twice)`);
  }
}

// --- 2. HTML structure: balanced key tags with location of mismatch ---
function checkTagBalance(tag) {
  const openRe = new RegExp(`<${tag}[\\s>]`, 'g');
  const closeRe = new RegExp(`</${tag}>`, 'g');
  const opens = [], closes = [];
  let m;
  while ((m = openRe.exec(html))) opens.push(m.index);
  while ((m = closeRe.exec(html))) closes.push(m.index);
  if (opens.length !== closes.length) {
    const diff = opens.length - closes.length;
    if (diff > 0) {
      // More opens than closes — report the last unmatched open
      const unmatchedOpen = opens[closes.length]; // first open without a close
      warnings.push(`Line ${lineOf(unmatchedOpen)}: <${tag}> mismatch: ${opens.length} opens, ${closes.length} closes (${diff} unclosed — first unmatched open here)`);
    } else {
      const unmatchedClose = closes[opens.length];
      warnings.push(`Line ${lineOf(unmatchedClose)}: </${tag}> mismatch: ${opens.length} opens, ${closes.length} closes (${Math.abs(diff)} extra close — first extra here)`);
    }
  }
}
checkTagBalance('div');
checkTagBalance('section');

// --- 3. Closing tags present ---
if (!html.includes('</html>')) errors.push(`Line ${lineOffsets.length}: Missing </html> — file may be truncated (file ends at line ${lineOffsets.length})`);
// An unterminated <script> swallows all following markup, and the module-block regex silently
// stops matching — so report the unbalanced block directly. (A bare "</script> exists anywhere"
// check is useless: the JSON data islands always satisfy it.)
{
  const scriptOpens = [...html.matchAll(/<script\b/g)];
  const scriptCloses = html.match(/<\/script>/g) || [];
  if (scriptOpens.length !== scriptCloses.length) {
    const unmatched = scriptOpens[scriptCloses.length];
    const where = unmatched ? `Line ${lineOf(unmatched.index)}: ` : '';
    errors.push(`${where}<script> mismatch: ${scriptOpens.length} opens, ${scriptCloses.length} closes — a script block is unterminated (everything after it is swallowed)`);
  }
}

// --- 4. Guide data: parse the JSON data block; images vs sources are structural ---
// All data lives in <script type="application/json" id="guide-data">. Parsing it (instead of
// regex-scraping) makes image-vs-source unambiguous and immune to quoting/multiline/concat issues,
// so shared source list-pages are never mistaken for duplicate images (§5/§8).
const dataEl = root.querySelector('script#guide-data');
let items = [];
let heroes = {};
if (!dataEl) {
  errors.push('No <script type="application/json" id="guide-data"> data block found');
} else {
  try {
    const parsed = JSON.parse(dataEl.rawText);
    items = Array.isArray(parsed) ? parsed : (parsed.items || []);
    heroes = Array.isArray(parsed) ? {} : (parsed.heroes || {});
  } catch (e) {
    errors.push(`Line ${nodeLine(dataEl)}: guide-data JSON is invalid — ${e.message}`);
  }
}
const dataStart = dataEl ? innerStart(dataEl) : 0;
const dataText = dataEl ? dataEl.rawText : '';
const lineForUrl = (url) => { const i = dataText.indexOf(url); return i >= 0 ? lineOf(dataStart + i) : nodeLine(dataEl); };

const imgUrls = [];      // rendered images: gallery images + <img src> (for count + reachability)
const galleryImgs = [];  // per-item gallery images ONLY (owner-aware, for the strict dup check)
for (const it of items) {
  const owner = (it && (it.name || it.id)) || '?';
  for (const im of (it && it.images) || []) {
    if (im && im.url) { const rec = { url: im.url, line: lineForUrl(im.url), owner }; imgUrls.push(rec); galleryImgs.push(rec); }
  }
}
// Seasonal per-season hero images (top-level `heroes` key) — counted and reachability-checked,
// but not part of the gallery dup check (a hero may legitimately reuse an item photo).
for (const h of Object.values(heroes)) {
  if (h && h.img) imgUrls.push({ url: h.img, line: lineForUrl(h.img) });
}
for (const im of root.querySelectorAll('img[src]')) {
  const src = im.getAttribute('src');
  if (src && /^https?:\/\//.test(src)) imgUrls.push({ url: src, line: nodeLine(im) });
}
const uniqueImgs = new Set(imgUrls.map(u => u.url));
if (items.length && uniqueImgs.size === 0) errors.push('No image URLs found in guide-data items');
else if (uniqueImgs.size && uniqueImgs.size < 10) warnings.push(`Only ${uniqueImgs.size} unique images (expected 30+)`);

// --- 5. Duplicate images across items (STRICT) ---
// The SAME image on two or more DIFFERENT items (distinct names) is a real defect — a
// bad media→item join, lazy reuse, or a fabricated/altered URL — so it is an ERROR.
// Reuse within ONE logical item is allowed: a seasonal guide shows the same place in
// its summer AND winter variants (same name, different season) and legitimately shares
// one photo; a hero/decorative <img> may also reuse an item photo (excluded via
// galleryImgs). Shared *sources* are excluded entirely (see §4).
const imgByUrl = {};     // all rendered image URLs -> lines (also used by §8 for line lookup)
for (const { url, line } of imgUrls) {
  if (!imgByUrl[url]) imgByUrl[url] = [];
  imgByUrl[url].push(line);
}
const galleryByUrl = {}; // gallery image URL -> { lines, owners:Set<name> }
for (const { url, line, owner } of galleryImgs) {
  if (!galleryByUrl[url]) galleryByUrl[url] = { lines: [], owners: new Set() };
  galleryByUrl[url].lines.push(line);
  galleryByUrl[url].owners.add(owner);
}
const dupes = Object.entries(galleryByUrl).filter(([, v]) => v.owners.size > 1);
if (dupes.length) {
  errors.push(`${dupes.length} image URL(s) reused across different items (each place needs its own image):`);
  dupes.slice(0, 10).forEach(([url, v]) => errors.push(`  Lines ${v.lines.join(', ')} [${[...v.owners].join(' / ')}]: ${url.slice(0, 70)}`));
}

// --- 5b. Section routing: orphan items (no mount) + empty sections (no item) ---
// Mirrors the scaffold render: a `.cards[data-section]` mount claims items whose `section`
// matches, season-agnostic. An item may instead be
// rendered by a hand-authored element carrying its id as `data-id` (a day-trip stop <li>, or the
// day-trip container / its <h3>) — that counts as rendered too. HTML comments are stripped so
// instructional `data-section` examples don't count.
if (items.length) {
  // Items rendered by a hand-authored element carrying their id as data-id (a day-trip stop <li>,
  // the day-trip container / its <h3>). querySelectorAll never descends into <script> raw text or
  // <!-- comments -->, so the render template's own data-id="${it.id}" literal and any commented-out
  // instructional markup are excluded automatically.
  const renderedIds = new Set();
  const carrierLines = {};                     // id → [line, …] of hand-authored data-id carriers
  for (const el of root.querySelectorAll('[data-id]')) {
    const id = el.getAttribute('data-id');
    renderedIds.add(id);
    (carrierLines[id] ||= []).push(nodeLine(el));
  }
  // The same id on two hand-authored elements: the map scrolls/highlights only the first in the
  // DOM — carry each id on the single element that best shows the place.
  const dupCarriers = Object.entries(carrierLines).filter(([, lines]) => lines.length > 1);
  if (dupCarriers.length) {
    warnings.push(`${dupCarriers.length} data-id value(s) carried by multiple elements (map sync scrolls to the first only):`);
    dupCarriers.slice(0, 10).forEach(([id, lines]) => warnings.push(`  Lines ${lines.join(', ')}: data-id="${id}"`));
  }
  const mounts = [];
  for (const el of root.querySelectorAll('.cards[data-section]')) {
    mounts.push({ section: el.getAttribute('data-section'), rail: el.classList.contains('rail'), line: nodeLine(el) });
  }
  if (mounts.length) {
    // Strict, mirroring the scaffold render loop (sectionOf = i => i.section): an item renders
    // either as a card (its `section` claimed by a mount) or in content (its id on a data-id
    // element); one with neither renders nowhere and is reported as an orphan. No category
    // fallback (removed from the scaffold; the validator must not mask what the runtime drops).
    const sectionOf = i => i && i.section;
    const claims = (mo, i) => mo.section === sectionOf(i);
    // Two mounts sharing a data-section both claim the same items — every matching card renders
    // twice. Section names must be unique per mount (route guides: name sections per stop).
    const seen = {};
    for (const mo of mounts) (seen[mo.section] ||= []).push(mo.line);
    const dupMounts = Object.entries(seen).filter(([, lines]) => lines.length > 1);
    if (dupMounts.length) {
      errors.push(`${dupMounts.length} data-section value(s) used by multiple mounts (cards render in EACH — duplicate cards):`);
      dupMounts.slice(0, 10).forEach(([sec, lines]) => errors.push(`  Lines ${lines.join(', ')}: data-section="${sec}"`));
    }
    const orphans = items.filter(it => !renderedIds.has(String(it.id)) && !mounts.some(mo => claims(mo, it)));
    if (orphans.length) {
      errors.push(`${orphans.length} item(s) reach no section mount (orphaned — they render nowhere):`);
      orphans.slice(0, 10).forEach(it => errors.push(`  "${it.name || it.id}" → ${it.section == null ? 'no "section" field (add one matching a mount, or carry the id on a data-id element in content)' : `section "${it.section}"`}`));
    }
    // An item claimed by a mount AND carried by a hand-authored data-id element renders twice —
    // the card (stamped with the same data-id at runtime) plus the content element — and the map's
    // scroll/highlight targets whichever comes first. Each item renders in exactly one place.
    const doubled = items.filter(it => renderedIds.has(String(it.id)) && mounts.some(mo => claims(mo, it)));
    if (doubled.length) {
      errors.push(`${doubled.length} item(s) render twice — as a card in a mount and via a data-id element in content (keep one: drop "section" for a content pin, or the data-id carrier for a card):`);
      doubled.slice(0, 10).forEach(it => errors.push(`  "${it.name || it.id}" → section "${it.section}" + data-id at line(s) ${carrierLines[String(it.id)].join(', ')}`));
    }
    const empty = mounts.filter(mo => !items.some(it => claims(mo, it)));
    if (empty.length) {
      warnings.push(`${empty.length} section mount(s) match no item (empty section):`);
      empty.slice(0, 10).forEach(mo => warnings.push(`  Line ${mo.line}: data-section="${mo.section}"`));
    }
    // Rails are column-flow lists that comfortably hold more cards than a grid before feeling
    // crowded, so they get a higher threshold (warn at 13+, i.e. up to 12 allowed). Grids warn at 7+.
    const large = mounts.map(mo => [mo, items.filter(it => claims(mo, it)).length]).filter(([mo, n]) => n >= (mo.rail ? 13 : 7));
    if (large.length) {
      warnings.push(`${large.length} section mount(s) hold too many cards — sub-divide into finer sections (rails: 12 max, grids: 6 max):`);
      large.slice(0, 10).forEach(([mo, n]) => warnings.push(`  Line ${mo.line}: data-section="${mo.section}" (${n} cards${mo.rail ? ', rail' : ''})`));
    }
    // A mount claiming exactly ONE non-feature card reads as unintentional (a lone card in an empty
    // grid row). Mark it feature:true (a grid-breaking hero fills the row) or merge into a neighbour.
    const singles = mounts.map(mo => [mo, items.filter(it => claims(mo, it))]).filter(([, its]) => its.length === 1 && !its[0].feature);
    if (singles.length) {
      warnings.push(`${singles.length} section mount(s) hold a single non-feature card — a lone card looks unintentional; mark it feature:true or merge into a neighbouring section:`);
      singles.slice(0, 10).forEach(([mo, its]) => warnings.push(`  Line ${mo.line}: data-section="${mo.section}" — "${its[0].name || its[0].id}"`));
    }
    // Two+ feature cards in ONE section stack as competing full-width feature cards — only ONE should show
    // at a time. Allowed ONLY when season-separated: every feature has a season and they're pairwise
    // disjoint (a season-less feature always co-shows; shared seasons co-show in that season).
    const seasonsOf = it => it.season == null ? [] : (Array.isArray(it.season) ? it.season : [it.season]);
    const multiFeature = [];
    for (const mo of mounts) {
      const feats = items.filter(it => it.feature && claims(mo, it));
      if (feats.length < 2) continue;
      const sets = feats.map(seasonsOf);
      const seen = new Set();
      let coShow = sets.some(s => s.length === 0);   // any season-less feature always co-shows
      for (const s of sets) for (const v of s) { if (seen.has(v)) coShow = true; seen.add(v); }
      if (coShow) multiFeature.push([mo, feats]);
    }
    if (multiFeature.length) {
      warnings.push(`${multiFeature.length} section mount(s) hold multiple feature cards that show together — only ONE feature card should appear at a time; keep a single feature:`);
      multiFeature.slice(0, 10).forEach(([mo, feats]) => warnings.push(`  Line ${mo.line}: data-section="${mo.section}" — ${feats.map(f => `"${f.name || f.id}"`).join(', ')}`));
    }
    // A feature card is a grid-breaking hero (grid-column:1/-1, image beside prose). A rail is a
    // horizontal scroll of uniform-width cards, so the span is ignored, the card renders cramped, AND
    // it scrolls out of view — the "unmissable" intent is lost either way. There is no CSS fix that
    // preserves the emphasis; the remedy is compositional. Hence an ERROR, not a warning.
    const railFeature = items.filter(it => it.feature && mounts.some(mo => mo.rail && claims(mo, it)));
    if (railFeature.length) {
      errors.push(`${railFeature.length} feature card(s) in a rail — a feature card is a grid-breaking hero (grid-column:1/-1); in a horizontal rail the span is ignored, it renders cramped, and it scrolls out of view. Move the item to a grid (non-rail) section, surface it as a highlight OUTSIDE the rail, or drop feature:true:`);
      railFeature.slice(0, 10).forEach(it => errors.push(`  "${it.name || it.id}"`));
    }
  }
}

// --- 5c. Rail nested in a grid (needs the DOM tree) ---
// A .cards.rail becomes a horizontal-scroll flex container; to scroll instead of expanding its
// track, min-width:0 must sit on the GRID ITEM (the grid's direct child). When the rail is wrapped
// in an intermediate element, `.cards.rail{min-width:0}` is on the wrong node and the rail blows out
// the column. Warn (not error): a rail in a grid WITH min-width:0 on the item is legitimate, and the
// CSS lookup below is a heuristic (top-level rules only, no full cascade).
{
  const styleText = root.querySelectorAll('style').map(s => s.rawText).join('\n');
  const cssByClass = {};
  for (const m of styleText.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const body = m[2];
    for (const c of m[1].matchAll(/\.([A-Za-z0-9_-]+)/g)) cssByClass[c[1]] = (cssByClass[c[1]] || '') + ';' + body;
  }
  const declsOf = el => {
    let d = (el.getAttribute && el.getAttribute('style')) ? el.getAttribute('style') + ';' : '';
    for (const c of ((el.getAttribute && el.getAttribute('class')) || '').split(/\s+/).filter(Boolean)) d += cssByClass[c] || '';
    return d;
  };
  const GRID_CLASSES = new Set(['two-col', 'special', 'special-grid', 'grid']);
  const isGrid = el => {
    if (!el || el.nodeType !== 1) return false;
    const cls = ((el.getAttribute && el.getAttribute('class')) || '').split(/\s+/);
    return cls.some(c => GRID_CLASSES.has(c)) || /display\s*:\s*grid/.test(declsOf(el));
  };
  const hasMinWidth0 = el => /min-(?:width|inline-size)\s*:\s*0(?:px|rem|em|%)?\s*[;}]/.test(declsOf(el) + ';');
  for (const rail of root.querySelectorAll('.cards.rail')) {
    let grid = null;
    for (let n = rail.parentNode; n && n.nodeType === 1; n = n.parentNode) {
      if (isGrid(n)) { grid = n; break; }
    }
    if (!grid) continue;
    let item = rail;
    while (item.parentNode && item.parentNode !== grid) item = item.parentNode;
    if (hasMinWidth0(item)) continue;
    const gd = (grid.getAttribute && grid.getAttribute('class'))
      ? '.' + grid.getAttribute('class').trim().split(/\s+/).join('.')
      : (grid.rawTagName || 'grid');
    warnings.push(`Line ${nodeLine(rail)}: a horizontal rail (.cards.rail) is nested inside a grid (${gd}) and the grid item has no min-width:0 — the rail can't scroll and expands the column. Put the rail full-width outside the grid, or add min-width:0 to the grid ITEM (not just .cards.rail).`);
  }
}

// --- 6. Key mechanisms present ---
function findOrWarn(text, msg) {
  const idx = html.indexOf(text);
  if (idx === -1) warnings.push(`Not found: ${msg}`);
}
findOrWarn('map-container', 'No .map-container found (map split may not work)');
findOrWarn('<dialog', 'No <dialog> element (lightbox may use old div pattern)');
if (!html.includes('car-dots') && !html.includes('car-nav')) warnings.push('Not found: No carousel elements (car-dots/car-nav)');
findOrWarn('invalidateSize', 'No invalidateSize() call (map may render gray after toggle)');

// --- 7. Fonts: hard-banned (AI slop) + overused (good, but appearing too often) ---
// Banned: AI-slop defaults we never want in a location-immersive guide. A trailing ' *' bans the
// whole family (Noto * = Noto Sans, Noto Serif JP, Noto Serif SC, …).
const banned = ['Inter', 'Roboto', 'Arial', 'Space Grotesk', 'Fraunces', 'Noto *'];
// Overused: perfectly good fonts that recur across too large a share of the catalog
// (measured by cross-location "spread"). Not forbidden — but reaching for one by default
// is how guides converge. Keep it only when it's the most distinctive, destination-true choice.
const overused = ['Playfair Display', 'Cormorant Garamond', 'Spectral', 'Shippori Mincho'];

// Match both the CSS form 'Name' and the Google Fonts URL form family=Name
// (URL-encodes spaces as '+', e.g. family=Playfair+Display). A trailing ' *' matches any
// family starting with that word (family=Noto+Sans+JP, 'Noto Serif SC'). Returns the real
// matched font name with each match.
// Scope font detection to CSS context — <style> blocks and <link href> tags — so a font name
// appearing in prose or the JSON data island isn't a false hit. Falls back to whole-document
// matching if node ranges are unavailable (never silently disables the check).
const cssRanges = [...root.querySelectorAll('style'), ...root.querySelectorAll('link[href]')]
  .map(el => el.range).filter(r => Array.isArray(r));
const inCss = cssRanges.length ? (idx => cssRanges.some(r => idx >= r[0] && idx < r[1])) : (() => true);
function fontMatches(name) {
  const wild = name.endsWith(' *');
  const esc = (wild ? name.slice(0, -2) : name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[+ ]');
  const re = wild
    ? new RegExp(`family=(${esc}\\+[A-Za-z+]+)|'(${esc} [^']+)'`, 'g')
    : new RegExp(`family=(${esc})|'(${esc})'`, 'g');
  return [...html.matchAll(re)].filter(m => inCss(m.index)).map(m => ({ index: m.index, font: (m[1] || m[2]).replace(/\+/g, ' ') }));
}

for (const f of banned) {
  const byFont = {};
  for (const m of fontMatches(f)) (byFont[m.font] ||= []).push(m.index);
  for (const [font, idxs] of Object.entries(byFont)) {
    warnings.push(`Line ${lineOf(idxs[0])}: Banned font: ${font}${idxs.length > 1 ? ` (${idxs.length}×)` : ''} — AI slop; it marks the guide as machine-made and interchangeable. Do NOT just swap it for another "safe" sans/serif — that repeats the mistake. Typography is a primary identity carrier: choose a display face that expresses THIS destination.`);
  }
}
for (const f of overused) {
  const ms = fontMatches(f);
  if (ms.length) {
    warnings.push(`Line ${lineOf(ms[0].index)}: Overused font: ${f} — allowed, but it already appears across a large share of guides. Keep it only if it is genuinely the most distinctive, destination-representative choice for THIS place; otherwise choose type that sets this guide apart.`);
  }
}

// --- 8. Image URL reachability (HEAD requests) ---
if (uniqueImgs.size > 0) {
  const broken = [];
  const urls = [...uniqueImgs];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const probe = async (url) => {
    let res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'travel-guide-validator/1.0' } });
    // Some hosts reject HEAD but serve GET fine (405/501). Retry with a ranged GET so a
    // working image isn't reported broken (the agent would wrongly strip it from ITEMS).
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'travel-guide-validator/1.0', 'Range': 'bytes=0-0' } });
      res.body?.cancel();
    }
    return res;
  };
  await Promise.allSettled(urls.map(async (url) => {
    try {
      let res = await probe(url);
      // 429 = rate-limited (we fire many probes at once), not a broken image. One retry with
      // jitter so the retries don't re-trigger the limit in unison.
      if (res.status === 429) { await sleep(2000 + Math.random() * 2000); res = await probe(url); }
      if (res.status === 429) { broken.push({ url, status: '429 (rate-limited — NOT broken, do not remove)' }); return; }
      if (!res.ok) broken.push({ url, status: res.status });
    } catch (e) { broken.push({ url, status: e.code || 'timeout' }); }
  }));
  if (broken.length) {
    warnings.push(`${broken.length}/${urls.length} image URLs broken:`);
    broken.forEach(b => {
      const lines = imgByUrl[b.url];
      warnings.push(`  Line ${lines[0]}: ${b.status} — ${b.url.slice(0, 80)}`);
    });
  }
}

// --- 9. Map wiring pitfalls ---
const mapEls = root.querySelectorAll('#map');
if (mapEls.length > 1) {
  const locs = mapEls.map(nodeLine);
  errors.push(`Lines ${locs.join(', ')}: Duplicate id="map" (${mapEls.length}x) — L.map('map') grabs the first match. Only the Leaflet div should have id="map".`);
}
if (firstModuleBody) {
  const sb = firstModuleBody;
  const sbStart = scriptStartLine;
  for (const m of sb.matchAll(/\._(on|off|map|events|latlng|leaflet_id|layers)\s*=(?!=)/g)) {
    const mLine = sbStart + sb.slice(0, m.index).split('\n').length - 1;
    errors.push(`Line ${mLine}: Assignment to Leaflet internal ("${m[0].trim()}") shadows a method and throws at runtime. Track state in a parallel object.`);
  }
  for (const m of sb.matchAll(/querySelectorAll\(\s*['"]\[data-cat\]['"]\s*\)/g)) {
    const mLine = sbStart + sb.slice(0, m.index).split('\n').length - 1;
    warnings.push(`Line ${mLine}: querySelectorAll('[data-cat]') also matches filter buttons — scope it (e.g. '.cards[data-cat]').`);
  }
}

// --- 10. Malformed hex colors ---
const badHex = [];
for (const m of html.matchAll(/#([0-9a-fA-F]{2,7})[ \t]+([0-9a-fA-F]{1,6})\s*[;,)}]/g)) {
  const len = (m[1] + m[2]).length;
  if (len === 6 || len === 8) badHex.push({ val: m[0].trim(), line: lineOf(m.index) });
}
for (const m of html.matchAll(/#[0-9a-fA-F]*[^\x00-\x7F][0-9a-fA-F]*/g)) {
  if ((m[0].slice(1).match(/[0-9a-fA-F]/g) || []).length >= 2) {
    badHex.push({ val: m[0], line: lineOf(m.index) });
  }
}
if (badHex.length) {
  errors.push('Malformed hex color(s) — a stray space or character voids the value:');
  badHex.forEach(h => errors.push(`  Line ${h.line}: ${JSON.stringify(h.val)}`));
}

// --- Report ---
console.log(`\n  ${file}`);
console.log(`  ${uniqueImgs.size} unique images | ${imgUrls.length} total image refs\n`);
if (errors.length) { console.log('  ERRORS:'); errors.forEach(e => console.log(`    ${e}`)); }
if (warnings.length) { console.log('  WARNINGS:'); warnings.forEach(w => console.log(`    ${w}`)); }
if (!errors.length && !warnings.length) console.log('  All checks passed');
console.log('');
process.exit(errors.length ? 1 : 0);
