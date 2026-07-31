#!/usr/bin/env node
/**
 * Agoda hotel search. Returns markdown table of hotels for a location.
 * Resolves location via Agoda autocomplete API, then scrapes search results.
 * Usage: node agoda.mjs --location "Colmar, France" --checkin 2026-06-15 --checkout 2026-06-17
 */
import { chromium } from 'playwright';

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i].replace(/^--/, '');
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) opts[key] = args[++i];
    else opts[key] = true;
  }
  return opts;
}

function defaultCheckin() { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().slice(0, 10); }
function nextDay(s) { const d = new Date(s); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }

async function resolveCityId(location) {
  const url = `https://www.agoda.com/api/cronos/search/GetUnifiedSuggestResult/3/16/1/0/en-us?searchText=${encodeURIComponent(location)}&isHotelLandSearch=true`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; hotels-skill)' } });
  if (!res.ok) return null;
  const data = await res.json();
  const items = data?.ViewModelList || [];
  if (!items.length) return null;
  const areas = items.filter(i => !i.IsHotel && i.ObjectId > 0);
  for (const item of areas) {
    if (item.CityId && item.CityId > 0 && item.CityId !== item.ObjectId)
      return { city: item.CityId, district: item.ObjectId };
  }
  return areas.length ? { city: areas[0].ObjectId } : { city: items[0]?.ObjectId };
}

function buildUrl(resolved, opts) {
  const checkin = opts.checkin || defaultCheckin();
  const checkout = opts.checkout || nextDay(checkin);
  const los = Math.max(1, Math.round((new Date(checkout) - new Date(checkin)) / 86400000));
  const params = new URLSearchParams({
    city: String(resolved.city), checkIn: checkin, los: String(los),
    rooms: '1', adults: String(opts.adults || 2), children: '0', currency: opts.currency || 'USD',
  });
  if (resolved.district) params.set('district', String(resolved.district));
  const sortMap = { price: 1, rating: 5, distance: 2 };
  if (opts.sort_by && sortMap[opts.sort_by]) params.set('sort', String(sortMap[opts.sort_by]));
  if (opts.stars) { for (let s = Number(opts.stars); s <= 5; s++) params.append('star', String(s)); }
  if (opts.price_min) params.set('priceFrom', String(opts.price_min));
  if (opts.price_max) params.set('priceTo', String(opts.price_max));
  return `https://www.agoda.com/search?${params}`;
}

async function scrape(opts) {
  const resolved = await resolveCityId(opts.location);
  if (!resolved) return null;

  const url = buildUrl(resolved, opts);
  const limit = Number(opts.limit) || 10;
  const ratingMin = opts.rating_min ? Number(opts.rating_min) : null;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.click('[data-element-name="consent-banner-reject-btn"]').catch(() => {});
    await page.waitForSelector('[data-hotelid]', { timeout: 25000 });
    await page.waitForTimeout(3000);

    const hotels = await page.evaluate((lim) => {
      const cards = document.querySelectorAll('[data-hotelid]');
      const results = [];
      for (const card of cards) {
        if (results.length >= lim) break;
        const lines = card.innerText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 5) continue;

        // Name from link slug
        let name = null;
        const linkEl = card.querySelector('a[href*="/hotel/"]');
        const href = linkEl?.href || '';
        const slug = href.match(/agoda\.com\/([^/]+)\/hotel/)?.[1];
        if (slug) name = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!name) continue;

        // Stars
        const starsLine = lines.find(l => /^\d stars? out of 5$/.test(l));
        const stars = starsLine ? parseInt(starsLine) : null;

        // Area
        const areaLine = lines.find(l => l.includes(' - View on map'));
        const address = areaLine ? areaLine.replace(' - View on map', '') : null;

        // Rating
        let rating = null;
        const ratingLine = lines.find(l => /^Average rating/.test(l));
        if (ratingLine) { const m = ratingLine.match(/([\d.]+)\s*out of\s*10/); if (m) rating = parseFloat(m[1]); }

        // Price (last USD value > 20)
        let price = null;
        for (let i = lines.length - 1; i >= 0; i--) {
          const m = lines[i].match(/^USD\s*(\d[\d,]*)/);
          if (m && parseFloat(m[1].replace(/,/g, '')) > 20) { price = 'USD ' + m[1]; break; }
        }

        // Image
        const img = card.querySelector('img[src*="agoda"], img[src*="bstatic"]');
        const image = img?.src || null;
        const link = href?.split('?')[0] || null;

        results.push({ name, price, rating, stars, address, link, image });
      }
      return results;
    }, limit);

    // Post-filter
    const results = [];
    for (const h of hotels) {
      if (results.length >= limit) break;
      if (ratingMin && h.rating !== null && h.rating < ratingMin) continue;
      results.push(h);
    }
    return results;
  } finally {
    await browser.close();
  }
}

// Main
const opts = parseArgs();
if (!opts.location) { console.error('Usage: node agoda.mjs --location "City, Country" [options]'); process.exit(1); }

const checkin = opts.checkin || defaultCheckin();
const checkout = opts.checkout || nextDay(checkin);
const results = await scrape(opts);

if (!results) {
  console.log(`## Agoda: ${opts.location} (${checkin} → ${checkout})\n\nCould not resolve location.\n`);
  process.exit(1);
}
if (results.length === 0) {
  console.log(`## Agoda: ${opts.location} (${checkin} → ${checkout})\n\nNo hotels found matching filters.\n`);
  process.exit(0);
}

let md = `## Agoda: ${opts.location} (${checkin} → ${checkout})\n\n`;
md += `| Hotel | Price/night | Rating | Stars | Area | Link | Image |\n`;
md += `|-------|-------------|--------|-------|------|------|-------|\n`;
for (const r of results) {
  const ratingStr = r.rating ? `${r.rating}/10` : '—';
  const starsStr = r.stars ? `${r.stars}★` : '—';
  const linkStr = r.link ? `[link](${r.link})` : '—';
  const img = r.image ? `[img](${r.image})` : '—';
  md += `| ${r.name} | ${r.price || '—'} | ${ratingStr} | ${starsStr} | ${r.address || '—'} | ${linkStr} | ${img} |\n`;
}
console.log(md);

// --- attribution: record hotel images for the credit/provenance pipeline (mirrors eater/infatuation) ---
if (opts.attribution) {
  const { writeFileSync, mkdirSync } = await import('fs');
  const images = results.filter(r => r.image).map(r => ({ url: r.image, sourcePage: r.link || 'https://www.agoda.com/' }));
  if (images.length) {
    const dir = String(opts.attribution).replace(/\/?$/, '/');
    mkdirSync(dir, { recursive: true });
    const file = `${dir}attribution-agoda-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
    writeFileSync(file, JSON.stringify({ siteName: 'Agoda', images }, null, 2));
  }
}
