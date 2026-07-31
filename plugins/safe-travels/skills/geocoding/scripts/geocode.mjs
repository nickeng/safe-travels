#!/usr/bin/env node
/**
 * Tiered batch geocoder. Zero-dependency (native fetch).
 *
 * Routing per item (first usable hit wins):
 *   1. US street address  -> US Census Geocoder        (source=census)
 *   2. anything else      -> Photon (komoot.io)        (source=photon)
 *
 * Quality gates:
 *   - City centroid plausibility: results beyond --radius-km of the city centroid are DROPPED.
 *   - Name-match confidence: if the returned name shares no meaningful words with the query,
 *     confidence is downgraded to "low" regardless of distance (likely a wrong match).
 *
 * Confidence: high (Census match, or precise Photon feature within radius with name match),
 *             medium (Photon within radius, name partially matches or is a known-type match),
 *             low (name mismatch, or beyond radius but kept).
 *
 * Data source: Photon uses OpenStreetMap data. Results are provided under the ODbL license.
 * Attribution: © OpenStreetMap contributors — https://www.openstreetmap.org/copyright
 *
 * Usage:
 *   node geocode.mjs [--json] "Place, City, Country" ...
 *   printf 'name | address | city | country\n...' | node geocode.mjs --batch [--json]
 * Flags: --batch  --json  --radius-km N (default 30)  --country "X" (default hint)  --help
 */

const args = process.argv.slice(2);
function flagVal(name, def) { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; }
const wantHelp = args.includes('--help') || args.includes('-h');
const batch = args.includes('--batch');
const json = args.includes('--json');
const radiusKm = Number(flagVal('--radius-km', '30'));
const defaultCountry = flagVal('--country', '');

if (wantHelp) { printHelp(); process.exit(0); }
if (!Number.isFinite(radiusKm) || radiusKm <= 0) { console.error(`Error: --radius-km must be a positive number, got "${flagVal('--radius-km', '')}"`); process.exit(2); }

// ---- collect items -------------------------------------------------------
const FLAGS_WITH_VAL = new Set(['--radius-km', '--country']);
const positionals = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--batch' || a === '--json' || a === '--help' || a === '-h') continue;
  if (FLAGS_WITH_VAL.has(a)) { i++; continue; }
  if (a.startsWith('--')) continue;
  positionals.push(a);
}

let items = [];
if (batch) {
  const stdin = await readStdin();
  for (const line of stdin.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [name = '', address = '', city = '', country = ''] = t.split('|').map(s => s.trim());
    items.push(makeItem({ name, address, city, country: country || defaultCountry }));
  }
} else {
  for (const q of positionals) items.push(makeItem({ name: q, address: '', city: '', country: defaultCountry, raw: q }));
}
if (!items.length) { console.error('Error: no input. Provide positional queries or pipe lines with --batch. See --help.'); process.exit(2); }

function makeItem({ name, address, city, country, raw }) {
  const label = raw || [name, city, country].filter(Boolean).join(', ');
  return { name, address, city, country, label, lat: null, lng: null, source: 'none', confidence: null, status: 'ok', display: null, distCentroidKm: null };
}

// ---- helpers -------------------------------------------------------------
const UA = 'travel-geocoder/3.0 (batch travel guide; https://github.com/komoot/photon)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
function readStdin() { return new Promise(res => { let d = ''; process.stdin.setEncoding('utf8'); process.stdin.on('data', c => d += c); process.stdin.on('end', () => res(d)); }); }
function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371, toR = d => d * Math.PI / 180;
  const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const US = new Set(['usa', 'us', 'united states', 'u.s.', 'u.s.a.', 'america', 'united states of america']);
const isUS = c => c && US.has(c.toLowerCase());
const looksLikeUSAddress = a => a && /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/.test(a);
const looksLikeStreet = a => a && /\d/.test(a);

// ---- name-match logic ----------------------------------------------------
// Extracts meaningful words (≥3 chars, lowercased, stripped of accents and punctuation)
function extractWords(str) {
  if (!str) return new Set();
  const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = normalized.split(/[\s,.\-''`()\/&]+/).filter(w => w.length >= 3);
  // Filter out common geographic noise words
  const NOISE = new Set(['the', 'and', 'von', 'del', 'der', 'des', 'les', 'las', 'los', 'city', 'town', 'park', 'street', 'road', 'ave', 'avenue', 'blvd', 'ward', 'district', 'temple', 'shrine', 'church', 'museum', 'hotel', 'inn', 'restaurant', 'cafe', 'bar', 'prefecture', 'province', 'state', 'national']);
  return new Set(words.filter(w => !NOISE.has(w)));
}

function nameMatchScore(queryName, resultDisplay, city, country) {
  const contextWords = new Set([...extractWords(city), ...extractWords(country)]);
  const qWords = new Set([...extractWords(queryName)].filter(w => !contextWords.has(w)));
  const rWords = extractWords(resultDisplay);
  if (qWords.size === 0) return 0.5; // name IS the city — can't judge
  if (rWords.size === 0) return 0.5;
  let matches = 0;
  for (const w of qWords) {
    for (const rw of rWords) {
      // Exact always counts. Containment (stems/compounds: "kinkaku" ⊂ "kinkakuji") only when
      // the contained word is ≥4 chars — a 3-char word inside a longer one is usually
      // coincidence ("bar" ⊂ "barbecue") and would inflate confidence.
      const contains = (long, short) => short.length >= 4 && long.includes(short);
      if (rw === w || contains(rw, w) || contains(w, rw)) { matches++; break; }
    }
  }
  return matches / qWords.size;
}

// ---- rate gates ----------------------------------------------------------
function makeGate(minMs) { let next = 0; return async () => { const now = Date.now(); if (now < next) await sleep(next - now); next = Date.now() + minMs; }; }
const photonGate = makeGate(350);  // be fair to komoot
const censusGate = makeGate(300);

// ---- providers -----------------------------------------------------------
async function photon(q, tries = 3) {
  for (let attempt = 0; attempt < tries; attempt++) {
    await photonGate();
    try {
      const url = `https://photon.komoot.io/api/?${new URLSearchParams({ q, limit: '3', lang: 'en' })}`;
      const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
      if (res.status === 429 || res.status === 503) {
        await sleep(2000 * (attempt + 1)); continue;
      }
      if (!res.ok) return null;
      const d = await res.json();
      if (!d.features || !d.features.length) return null;
      // Return top 3 candidates for name-match filtering
      return d.features.map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties || {};
        return { lat: +lat, lng: +lng, display: [p.name, p.city, p.state, p.country].filter(Boolean).join(', '), name: p.name || '' };
      });
    } catch { await sleep(1500 * (attempt + 1)); }
  }
  return null;
}

async function census(address) {
  await censusGate();
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${new URLSearchParams({ benchmark: 'Public_AR_Current', format: 'json', address })}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const d = await res.json();
    const m = d.result && d.result.addressMatches && d.result.addressMatches[0];
    if (!m) return null;
    return { lat: +m.coordinates.y, lng: +m.coordinates.x, display: m.matchedAddress };
  } catch { return null; }
}

// ---- PASS 1: city centroids (via Photon) --------------------------------
const centroids = new Map(); // "city|country" -> {lat,lng} | null
const cityKeys = [...new Set(items.filter(i => i.city).map(i => `${i.city}|${i.country}`))];
for (const key of cityKeys) {
  const [city, country] = key.split('|');
  const q = [city, country].filter(Boolean).join(', ');
  const results = await photon(q);
  const r = results && results[0];
  centroids.set(key, r ? { lat: r.lat, lng: r.lng } : null);
  process.stderr.write(`centroid ${city}${country ? ', ' + country : ''} -> ${r ? r.lat.toFixed(3) + ',' + r.lng.toFixed(3) : 'unknown'}\n`);
}

// ---- PASS 2: resolve each item ------------------------------------------
function centroidOf(it) { return it.city ? centroids.get(`${it.city}|${it.country}`) : null; }
function assign(it, source, r, confidence, status = 'ok') {
  it.source = source; it.lat = r.lat; it.lng = r.lng; it.display = r.display; it.confidence = confidence; it.status = status;
  const c = centroidOf(it);
  if (c) it.distCentroidKm = +haversineKm(c.lat, c.lng, r.lat, r.lng).toFixed(1);
}

for (const it of items) {
  const c = centroidOf(it);
  const far = r => c ? haversineKm(c.lat, c.lng, r.lat, r.lng) > radiusKm : false;
  const nameQuery = [it.name, it.city, it.country].filter(Boolean).join(', ');
  const addressQuery = [it.address, it.city, it.country].filter(Boolean).join(', ');
  const query = looksLikeStreet(it.address) ? addressQuery : nameQuery;

  // 1. US Census — country says US, OR the address itself carries a US ZIP+state signal.
  if ((isUS(it.country) || looksLikeUSAddress(it.address)) && looksLikeStreet(it.address)) {
    const r = await census(it.address);
    if (r) { assign(it, 'census', r, 'high'); logItem(it); continue; }
  }

  // 2. Photon — up to 3 candidates; select the best-named IN-RADIUS candidate. The plausibility
  // guard's premise is far = wrong place, so far candidates never compete.
  const candidates = await photon(query);
  if (candidates && candidates.length > 0) {
    const near = candidates.filter(c => !far(c));
    let best = null, bestScore = -1;
    for (const cand of near) {
      const nms = nameMatchScore(it.name, cand.display, it.city, it.country);
      if (nms > bestScore) { bestScore = nms; best = cand; }
    }

    if (best) {
      const confidence = bestScore >= 0.5 ? 'high' : bestScore >= 0.25 ? 'medium' : 'low';
      assign(it, 'photon', best, confidence);
      logItem(it);
      continue;
    } else {
      // Every candidate beyond radius — drop (don't assign)
      logItem(it, 'photon-dropped(far)');
      continue;
    }
  }

  // Unresolved
  logItem(it, 'none');
}

function logItem(it, note) {
  const ok = it.lat != null;
  const st = it.status !== 'ok' ? ` {${it.status}}` : '';
  const nm = it.confidence === 'low' ? ' ⚠name' : '';
  process.stderr.write(`${ok ? 'OK ' : '-- '}[${it.source}/${it.confidence || '-'}${nm}${st}] ${it.label}${ok ? ` => ${it.lat.toFixed(5)},${it.lng.toFixed(5)} (${it.display?.substring(0, 40)})` : (note ? ` (${note})` : '')}\n`);
}

// ---- output --------------------------------------------------------------
const resolved = items.filter(i => i.lat != null);
const byConf = { high: 0, medium: 0, low: 0 };
for (const i of resolved) byConf[i.confidence]++;
const lowConfItems = resolved.filter(i => i.confidence === 'low');

if (json) {
  console.log(JSON.stringify({
    count: items.length, resolved: resolved.length, failed: items.length - resolved.length,
    byConfidence: byConf,
    attribution: '© OpenStreetMap contributors, ODbL — https://www.openstreetmap.org/copyright',
    results: items.map(i => ({ query: i.label, lat: i.lat, lng: i.lng, source: i.source, confidence: i.confidence, status: i.status, distCentroidKm: i.distCentroidKm, display: i.display })),
  }, null, 2));
} else {
  console.log(`Resolved ${resolved.length}/${items.length}  (high:${byConf.high} medium:${byConf.medium} low:${byConf.low})\n`);
  console.log('| Query | Lat | Lng | Source | Confidence | Display |');
  console.log('|-------|-----|-----|--------|------------|---------|');
  for (const i of items) {
    console.log(i.lat != null
      ? `| ${i.label} | ${i.lat.toFixed(5)} | ${i.lng.toFixed(5)} | ${i.source} | ${i.confidence} | ${i.display || ''} |`
      : `| ${i.label} | — | — | none | — | (not found) |`);
  }
  if (lowConfItems.length) {
    console.log(`\n> ⚠ ${lowConfItems.length} result(s) marked **low confidence** (name mismatch). The returned location may not be the place you searched for — verify before using on a map.`);
  }
  console.log(`\n> Data © OpenStreetMap contributors, available under the ODbL license — https://www.openstreetmap.org/copyright`);
}

function printHelp() {
  process.stdout.write(`Tiered batch geocoder (zero-dependency, keyless).

Resolves place names and street addresses to lat/lng. Routes automatically:
  US street address -> US Census;  else Photon/OSM (with name-match quality check).
Each result carries a confidence (high|medium|low) and its source.

USAGE
  node geocode.mjs [--json] "Place, City, Country" ["..."]
  printf 'name | address | city | country\\n' | node geocode.mjs --batch [--json]

INPUT (batch)
  Pipe-delimited lines on stdin: name | address | city | country   (any field may be blank)
  Provide city/country when known: enables the plausibility guard + better results.

FLAGS
  --batch          read pipe-delimited items from stdin
  --json           emit JSON instead of the markdown table
  --radius-km N    city-centroid plausibility radius (default 30)
  --country "X"    default country hint for batch lines that omit it
  --help, -h       this help

OUTPUT
  Markdown table (or JSON) with Source, Confidence, and Display columns.
  Confidence:
    high   = Census match, or Photon result within radius with strong name match
    medium = within radius, partial name match (likely correct)
    low    = name mismatch — the returned place may NOT be what you searched for

  Low-confidence results should be verified or excluded from map display. The Display
  column shows what the geocoder actually matched — compare it to your query.

EXIT CODES
  0 completed (partial resolution is normal)   2 usage error
`);
}
