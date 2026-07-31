#!/usr/bin/env node
/**
 * Eater "best restaurants" extractor — portable, zero-dependency (native fetch + regex).
 *
 * Two steps: search Eater for a city's list pages, then parse the map page you pick.
 *   node eater.mjs --search "<query>"       # list Eater search candidates ([MAP] = parseable)
 *   node eater.mjs --url <eater-map-url>    # parse a specific map page into a restaurant list
 * Flags: [--json] [--attribution <dir>]
 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '').trim();
const stripTags = (h) => h.replace(/<[^>]+>/g, ' ').replace(/<[^>]*$/, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&#8217;/g, "'").replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const cleanTitle = (t) => (t || '').replace(/\s*[|\u2013\u2014-]\s*Eater.*$/i, '').trim();

// ── Eater's own search (fronted by /api/search) ───────────────────────────────────────────────
async function search(query, page = 0) {
  const url = `https://www.eater.com/api/search?q=${encodeURIComponent(query)}&page=${page}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Eater search HTTP ${res.status}`);
  const j = await res.json();
  const results = (j.results || []).map((r, i) => {
    const d = (r.document && r.document.derivedStructData) || {};
    return {
      rank: i,
      title: cleanTitle(d.title),
      url: d.link || null,
      isMap: /\/maps\//.test(d.link || ''),
      snippet: (d.snippets && d.snippets[0] && d.snippets[0].snippet) || null,
      image: (d.pagemap && d.pagemap.cse_image && d.pagemap.cse_image[0] && d.pagemap.cse_image[0].src) || null,
    };
  }).filter((r) => r.url);
  return { query, totalSize: j.totalSize ?? null, results };
}

// ── Map-page parser (server-rendered) ─────────────────────────────────────────────────────────
function listMeta(html) {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const j = JSON.parse(m[1]); if (j['@type'] === 'ItemList') return j; } catch {}
  }
  return null;
}

// Per-restaurant marker objects: "location":{lat,lng},"name":..,"phone":..,"url":..
function markers(html) {
  const out = new Map();
  const re = /"location":\{"latitude":(-?\d+\.\d+),"longitude":(-?\d+\.\d+)\},"name":"((?:[^"\\]|\\.)*)","phone":(null|"[^"]*"),"url":(null|"[^"]*")/g;
  let m;
  while ((m = re.exec(html))) {
    const name = JSON.parse(`"${m[3]}"`);
    out.set(norm(name), { lat: +m[1], lng: +m[2], phone: m[4] === 'null' ? null : JSON.parse(m[4]), website: m[5] === 'null' ? null : JSON.parse(m[5]) });
  }
  return out;
}

function cards(html) {
  const parts = html.split('duet--article--map-card').slice(1);
  return parts.map((raw) => {
    const seg = raw.replace(/^[^>]*>/, ''); // drop the dangling class/data-slug attrs left by the split
    const mapM = seg.match(/href="(https:\/\/www\.google\.[a-z.]+\/maps[^"]+)"/);
    const mapUrl = mapM ? mapM[1].replace(/&amp;/g, '&') : null;
    let name = null, address = null;
    if (mapUrl) {
      const q = decodeURIComponent((mapUrl.match(/[?&]query=([^&]+)/) || [])[1] || '');
      const i = q.indexOf(','); name = i > 0 ? q.slice(0, i).trim() : q.trim(); address = i > 0 ? q.slice(i + 1).trim() : null;
    }
    const txt = stripTags(seg.slice(0, mapM ? mapM.index : 4000));
    const openFor = (txt.match(/Open for:\s*(.+?)\s*(?:Price rang|$)/i) || [])[1] || null;
    const price = (txt.match(/Price range:\s*(\$+|[^.]+?)(?:\s{2}|\s[A-Z]|$)/i) || [])[1] || null;
    let blurb = txt.replace(/^.*?Price range:\s*(?:\$+|[^.]+?)\s+/i, '').replace(/^.*?Open for:\s*[^.]+\.\s*/i, '').trim();
    if (!name) name = (seg.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1]?.replace(/<[^>]+>/g, '').trim() || null;
    return { name, address, mapUrl, openFor, priceRange: price, blurb: blurb.slice(0, 600) || null };
  }).filter((c) => c.name);
}

async function extract(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Eater HTTP ${res.status}`);
  const html = await res.text();
  const meta = listMeta(html);
  const mk = markers(html);
  const ld = new Map((meta?.itemListElement || []).map((e) => [norm(e.item?.name), { position: e.position, image: e.item?.image || null, anchor: e.item?.url || null }]));
  const restaurants = cards(html).map((c) => {
    const k = norm(c.name); const m = mk.get(k) || {}; const l = ld.get(k) || {};
    return { position: l.position ?? null, name: c.name, address: c.address, lat: m.lat ?? null, lng: m.lng ?? null,
      openFor: c.openFor, priceRange: c.priceRange, website: m.website || null, phone: m.phone || null,
      mapUrl: c.mapUrl, image: l.image || null, eaterAnchor: l.anchor || null, blurb: c.blurb };
  });
  return { url, title: meta?.name || null, description: meta?.description || null, count: restaurants.length, withCoords: restaurants.filter((r) => r.lat != null).length, restaurants };
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const json = argv.includes('--json');
const url = flag('--url');
const searchQuery = flag('--search');
const attrPath = flag('--attribution');

if ((!url && !searchQuery) || argv.includes('--help')) {
  console.log('Usage:\n  node eater.mjs --search "<query>"     # list Eater search candidates ([MAP] = parseable)\n  node eater.mjs --url <eater-map-url>  # parse a specific map page\nFlags: [--json] [--attribution <dir>]');
  process.exit(url || searchQuery ? 0 : 1);
}

try {
  // --search: surface candidate pages from Eater's own index; the agent picks a [MAP] page to parse
  if (searchQuery) {
    const s = await search(searchQuery);
    if (json) console.log(JSON.stringify(s, null, 2));
    else {
      console.log(`\n# Eater search: "${s.query}"  (${s.totalSize ?? '?'} total matches)\n`);
      s.results.forEach((r) => console.log(`  ${r.isMap ? '[MAP] ' : '      '}${r.title}\n         ${r.url}${r.snippet ? `\n         ${r.snippet.slice(0, 140)}` : ''}\n`));
    }
    process.exit(0);
  }

  // --url: parse a specific Eater map page into the restaurant list
  const out = await extract(url);
  if (json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`\n# ${out.title}\n   ${out.count} restaurants (${out.withCoords} with coords)\n`);
    out.restaurants.forEach((r) => console.log(`  ${r.name} ${r.priceRange || ''}${r.openFor ? ` · Open for: ${r.openFor}` : ''}\n     ${r.address || ''}${r.lat != null ? `  [${r.lat},${r.lng}]` : ''}\n     ${(r.blurb || '').slice(0, 140)}${r.image ? `\n     img: ${r.image}` : ''}\n`));
  }
  if (attrPath) {
    const { writeFileSync, mkdirSync } = await import('fs');
    const images = out.restaurants.filter((r) => r.image).map((r) => ({ url: r.image, sourcePage: r.eaterAnchor || url }));
    if (images.length) {
      const data = { siteName: 'Eater', images };
      const dir = attrPath.replace(/\/?$/, '/');
      mkdirSync(dir, { recursive: true });
      const file = `${dir}attribution-eater-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
      writeFileSync(file, JSON.stringify(data, null, 2));
    }
  }
} catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
