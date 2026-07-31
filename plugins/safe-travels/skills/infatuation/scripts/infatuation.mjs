#!/usr/bin/env node
/**
 * The Infatuation restaurant data as a portable, zero-dependency CLI.
 * Ports the infatuation-mcp server to a skill script (native fetch + regex only).
 *
 * Commands:
 *   cities                         list supported city slugs (sitemap scrape)
 *   filters --city <slug>          neighborhoods / cuisines / vibes for a city
 *   search  --city <slug> [...]    ranked restaurant reviews (GraphQL)
 *   guide   --slug <slug> --city <slug> | --url <reviewUrl>   dishes to order + prose
 *
 * Common: --json for structured output. See `--help`.
 */
const ENDPOINT = 'https://www.theinfatuation.com/direct/api/post-search/public/graphql';
const HEADERS = {
  'Content-Type': 'application/json',
  Origin: 'https://www.theinfatuation.com',
  Referer: 'https://www.theinfatuation.com/',
  'User-Agent': 'Mozilla/5.0 (compatible; infatuation-skill)',
};
const PAGE_HEADERS = { 'User-Agent': HEADERS['User-Agent'], Accept: 'text/html,application/xhtml+xml', Origin: HEADERS.Origin, Referer: HEADERS.Referer };

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const deslug = (s) => s.replace(/-/g, ' ').trim();
const deSlugify = (slug) => slug.split('-').map((p, i, a) => (p.length === 2 && i === a.length - 1 && a.length > 1) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
const roundRating = (n) => (n == null || n === 0) ? null : Math.round(n * 10) / 10;
const PRICE_DISPLAY = { INEXPENSIVE: '$', MODERATELY_EXPENSIVE: '$$', EXPENSIVE: '$$$', VERY_EXPENSIVE: '$$$$' };
const PRICE_INPUT = { cheap: 'INEXPENSIVE', moderate: 'MODERATELY_EXPENSIVE', expensive: 'EXPENSIVE', 'very-expensive': 'VERY_EXPENSIVE' };
const VIBE_TO_PRICE = { 'cheap-eats': 'INEXPENSIVE', 'corporate-cards': 'EXPENSIVE' };

async function graphql(query, variables, timeoutMs = 12000) {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: HEADERS, body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`Infatuation API HTTP ${res.status} ${res.statusText}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(`GraphQL errors: ${body.errors.map(e => e.message).join('; ')}`);
  if (!body.data) throw new Error('Missing data field');
  return body.data;
}

const SEARCH_POSTS = `query S($input: PostSearchInput!){searchPosts(input:$input){nodes{__typename ... on PostReview{placeName placeRatingNumber placePriceIndicatorCode placeStreetName placeCityName placeAddressPostalCode shortDescriptionText headline url slugName placeUrl placeReservationUrl placeReservationPlatformName postImage{cloudinary{imageIdentifier}} neighborhoods{... on Neighborhood{neighborhoodDisplayName neighborhoodName neighborhoodAttributePathText}} cuisines{... on Cuisine{cuisineDisplayName cuisineName cuisineAttributePathText}}}} pageInfo{endpageDirectionCode} receivedRecordCount}}`;

function resolveName(o, kind) {
  const dn = o[`${kind}DisplayName`]?.trim(); if (dn) return dn;
  const nm = o[`${kind}Name`]?.trim(); if (nm) return nm;
  const seg = (o[`${kind}AttributePathText`] || '').split('/').pop() || '';
  return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function pickPrimaryFilter({ city = 'london', neighborhood, cuisine, vibe, query }) {
  const c = slugify(city), secondary = [];
  let path, vibePrice;
  const vSlug = vibe ? slugify(vibe) : undefined;
  const vPrice = vSlug ? VIBE_TO_PRICE[vSlug] : undefined;
  if (neighborhood) {
    path = `/${c}/neighborhoods/${slugify(neighborhood)}`;
    if (cuisine) secondary.push(deslug(slugify(cuisine)));
    if (vSlug) vPrice ? (vibePrice = vPrice) : secondary.push(deslug(vSlug));
  } else if (cuisine) {
    path = `/${c}/cuisines/${slugify(cuisine)}`;
    if (vSlug) vPrice ? (vibePrice = vPrice) : secondary.push(deslug(vSlug));
  } else if (vSlug) { path = `/${c}/perfect-for/${vSlug}`; }
  else { path = `/${c}`; }
  if (query) secondary.push(query);
  return { attributePathText: path, searchText: secondary.length ? secondary.join(' ') : undefined, vibePrice };
}

function formatReview(n) {
  const rating = roundRating(n.placeRatingNumber);
  const address = [n.placeStreetName, n.placeCityName, n.placeAddressPostalCode].filter(Boolean).join(', ');
  const neighborhoods = (n.neighborhoods || []).map(x => resolveName(x, 'neighborhood'));
  const cuisines = (n.cuisines || []).map(x => resolveName(x, 'cuisine'));
  const imgId = n.postImage?.cloudinary?.imageIdentifier;
  // `.../banners/banner_image` is Infatuation's map placeholder shown when a review
  // has no real photo — drop it so we don't hand a map back as the restaurant's image.
  const image = (imgId && !/\/banners\/banner_image$/.test(imgId)) ? `https://res.cloudinary.com/the-infatuation/image/upload/c_scale,w_800,q_auto,f_auto/${imgId}` : undefined;
  return {
    name: n.placeName, rating, priceDisplay: PRICE_DISPLAY[n.placePriceIndicatorCode] || n.placePriceIndicatorCode,
    address, neighborhoods, cuisines, description: n.shortDescriptionText, headline: n.headline || undefined,
    url: n.url, slugName: n.slugName, image,
    website: n.placeUrl || undefined, reservationUrl: n.placeReservationUrl || undefined, reservationPlatform: n.placeReservationPlatformName || undefined,
  };
}

async function search(a) {
  const { attributePathText, searchText, vibePrice } = pickPrimaryFilter(a);
  const input = { attributePathText, sizeNumber: a.limit || 10, postCategoryTypeText: ['POST_REVIEW'] };
  if (searchText) input.searchText = searchText;
  if (a.price) input.placePriceIndicatorCode = [PRICE_INPUT[a.price] || a.price.toUpperCase()];
  else if (vibePrice) input.placePriceIndicatorCode = [vibePrice];
  if (a.cursor) input.paginationContextualText = a.cursor;
  const data = await graphql(SEARCH_POSTS, { input });
  const { nodes, pageInfo, receivedRecordCount } = data.searchPosts;
  let results = (nodes || []).filter(n => n.__typename === 'PostReview').map(formatReview);
  if (a.minRating != null) results = results.filter(r => r.rating != null && r.rating >= a.minRating);
  return { query: input.attributePathText, searchText, results, receivedRecordCount, hasMore: pageInfo.endpageDirectionCode != null, nextCursor: pageInfo.endpageDirectionCode };
}

// ---- Review-page parsing (Next.js __NEXT_DATA__ Apollo cache) ----
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
const ref = (state, x) => (isObj(x) && typeof x.__ref === 'string') ? (state[x.__ref] ?? {}) : (x ?? {});
const BLOCKS = new Set(['paragraph', 'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6', 'list-item']);
function richText(node) {
  if (!isObj(node)) return '';
  if (node.nodeType === 'text' && typeof node.value === 'string') return node.value;
  const joined = (Array.isArray(node.content) ? node.content : []).map(richText).join('');
  return BLOCKS.has(node.nodeType) ? joined + '\n\n' : joined;
}
function parseReviewPage(html, targetSlug) {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  const empty = { found: false };
  if (!m) return empty;
  let data; try { data = JSON.parse(m[1]); } catch { return empty; }
  const state = data?.props?.pageProps?.initialApolloState;
  if (!isObj(state)) return empty;
  const reviews = Object.entries(state).filter(([k, v]) => k.startsWith('PostReview:') && isObj(v));
  let review = null;
  for (const [, r] of reviews) { const s = ref(state, r.slug); if (isObj(s) && s.name === targetSlug) { review = r; break; } }
  if (!review && reviews.length === 1) review = reviews[0][1];
  if (!review) return empty;
  // food rundown
  const foodRundown = [];
  const links = ref(state, ref(state, review.content).links);
  const entries = ref(state, links.entries);
  for (const block of (Array.isArray(entries.block) ? entries.block : [])) {
    if (!isObj(block) || block.__typename !== 'FoodRundown') continue;
    const ck = Object.keys(block).find(k => k.startsWith('foodRundownItemCollection'));
    const coll = ck && block[ck];
    for (const it of (isObj(coll) && Array.isArray(coll.items) ? coll.items : [])) {
      if (isObj(it) && typeof it.name === 'string' && it.name.trim()) foodRundown.push({ name: it.name.trim(), description: (it.description || '').trim() });
    }
  }
  // perfect-for
  const sk = Object.keys(review).find(k => k.startsWith('sectionsCollection'));
  const sc = sk && review[sk];
  const perfectFor = new Set();
  for (const r of (isObj(sc) && Array.isArray(sc.items) ? sc.items : [])) {
    const sec = ref(state, r); const p = isObj(sec) && sec.path;
    const mm = typeof p === 'string' && p.match(/\/perfect-for\/([a-z0-9-]+)$/); if (mm) perfectFor.add(mm[1]);
  }
  const content = ref(state, review.content);
  const prose = content.json ? richText(content.json).replace(/\n{3,}/g, '\n\n').trim() : '';
  return { found: true, name: typeof review.title === 'string' ? review.title : '', rating: roundRating(typeof review.rating === 'number' ? review.rating : null), preview: review.preview || '', reviewProse: prose, perfectFor: [...perfectFor].sort(), foodRundown };
}

async function guide(a) {
  let url, slug;
  if (a.url) { const u = new URL(a.url); const parts = u.pathname.split('/').filter(Boolean); slug = parts[parts.length - 1]; url = `https://www.theinfatuation.com${u.pathname}`; }
  else { slug = a.slug; url = `https://www.theinfatuation.com/${a.city || 'london'}/reviews/${slug}`; }
  const res = await fetch(url, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return { found: false, url, slug };
  if (!res.ok) throw new Error(`Review page HTTP ${res.status}`);
  return { ...parseReviewPage(await res.text(), slug), url, slug };
}

async function scrapeText(url) {
  const res = await fetch(url, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return '';
  return res.text();
}

async function filters(city) {
  const html = await scrapeText(`https://www.theinfatuation.com/${city}`);
  const out = { neighborhoods: new Map(), cuisines: new Map(), vibes: new Map() };
  const key = { neighborhoods: 'neighborhoods', cuisines: 'cuisines', 'perfect-for': 'vibes' };
  const esc = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`/${esc}/(neighborhoods|cuisines|perfect-for)/([a-z0-9][a-z0-9-]*)`, 'g');
  let m; while ((m = re.exec(html))) out[key[m[1]]].set(m[2], { slug: m[2], name: deSlugify(m[2]) });
  return { city, neighborhoods: [...out.neighborhoods.values()], cuisines: [...out.cuisines.values()], vibes: [...out.vibes.values()] };
}

async function cities() {
  const html = await scrapeText('https://www.theinfatuation.com/sitemap');
  const slugs = new Set(); const re = /href="\/([a-z][a-z0-9-]*)\/(?:neighborhoods|cuisines|perfect-for)\//g;
  let m; while ((m = re.exec(html))) slugs.add(m[1]);
  return [...slugs].sort().map(slug => ({ slug, name: deSlugify(slug) }));
}

// ---- CLI ----
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const has = (f) => argv.includes(f);
const json = has('--json');
const attrPath = flag('--attribution', null);
const HELP = `infatuation.mjs <command> [flags]
  cities
  filters --city <slug>
  search  --city <slug> [--cuisine <c>] [--neighborhood <n>] [--vibe <v>] [--query <q>] [--price cheap|moderate|expensive|very-expensive] [--min-rating <n>] [--limit <n>] [--cursor <c>]
  guide   --slug <slug> [--city <slug>] | --url <reviewUrl>
Common: --json`;

try {
  if (!cmd || has('--help')) { console.log(HELP); process.exit(cmd ? 0 : 1); }
  let out;
  if (cmd === 'cities') out = await cities();
  else if (cmd === 'filters') out = await filters(flag('--city', 'london'));
  else if (cmd === 'search') out = await search({ city: flag('--city', 'london'), cuisine: flag('--cuisine'), neighborhood: flag('--neighborhood'), vibe: flag('--vibe'), query: flag('--query'), price: flag('--price'), minRating: flag('--min-rating') != null ? +flag('--min-rating') : null, limit: +flag('--limit', '10'), cursor: flag('--cursor') });
  else if (cmd === 'guide') out = await guide({ slug: flag('--slug'), city: flag('--city'), url: flag('--url') });
  else { console.error(`Unknown command: ${cmd}\n\n${HELP}`); process.exit(1); }

  if (json) { console.log(JSON.stringify(out, null, 2)); }
  else if (cmd === 'cities') {
    console.log(`\n${out.length} cities covered (pass a slug to --city):\n`);
    console.log(out.map(c => c.slug).join(', '));
  } else if (cmd === 'filters') {
    console.log(`\nFilters for ${out.city} (use these slugs in search):`);
    console.log(`  Neighborhoods: ${out.neighborhoods.map(n => n.slug).join(', ') || '—'}`);
    console.log(`  Cuisines: ${out.cuisines.map(n => n.slug).join(', ') || '—'}`);
    console.log(`  Vibes: ${out.vibes.map(n => n.slug).join(', ') || '—'}`);
  } else if (cmd === 'search') {
    console.log(`\n${out.query}${out.searchText ? ` + "${out.searchText}"` : ''} — ${out.results.length} of ${out.receivedRecordCount}${out.hasMore ? ' (more)' : ''}\n`);
    out.results.forEach(r => console.log(`  ${r.rating ?? '–'}/10 ${r.priceDisplay} · ${r.name} · ${[...r.cuisines, ...r.neighborhoods].join(', ')}\n     ${r.description}${r.address ? `\n     ${r.address}` : ''}${r.image ? `\n     img: ${r.image}` : ''}\n`));
  } else if (cmd === 'guide') {
    if (!out.found) { console.log(`Not found: ${out.url}`); }
    else { console.log(`\n## ${out.name}  ${out.rating ?? '–'}/10`); if (out.perfectFor.length) console.log(`Perfect for: ${out.perfectFor.map(deSlugify).join(', ')}`); if (out.preview) console.log(`\n${out.preview}`); if (out.foodRundown.length) { console.log(`\nWhat to order:`); out.foodRundown.forEach(i => console.log(`  • ${i.name} — ${i.description}`)); } console.log(`\n${out.url}`); }
  }

  // Write attribution if --attribution specified and search returned images
  if (attrPath && cmd === 'search' && out.results) {
    const { writeFileSync, mkdirSync } = await import('fs');
    const images = out.results.filter(r => r.image).map(r => ({ url: r.image, sourcePage: r.url || null }));
    if (images.length) {
      const data = { siteName: "The Infatuation", images };
      const dir = attrPath.replace(/\/?$/, '/');
      mkdirSync(dir, { recursive: true });
      const file = `${dir}attribution-infatuation-${Date.now()}-${Math.random().toString(36).slice(2,6)}.json`;
      writeFileSync(file, JSON.stringify(data, null, 2));
    }
  }
} catch (e) { console.error(`Error: ${e.message}`); process.exit(1); }
