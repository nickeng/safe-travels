#!/usr/bin/env node
/**
 * Booking.com hotel search. Returns markdown table of hotels for a location.
 * Usage: node booking.mjs --location "Shinjuku, Tokyo, Japan" --checkin 2026-04-01 --checkout 2026-04-05
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

const SORT_MAP = { price: 'price', rating: 'review_score_and_price', distance: 'distance' };
const PROPERTY_TYPE_MAP = { hotel: 204, apartment: 201, hostel: 203, boutique: 208, ryokan: 218 };

function buildUrl(opts) {
  const checkin = opts.checkin || defaultCheckin();
  const checkout = opts.checkout || nextDay(checkin);
  const params = new URLSearchParams({
    ss: opts.location, checkin, checkout,
    group_adults: String(opts.adults || 2), no_rooms: '1', group_children: '0',
    selected_currency: opts.currency || 'USD',
    order: SORT_MAP[opts.sort_by] || SORT_MAP.rating,
  });
  const filters = [];
  if (opts.stars) { for (let s = Number(opts.stars); s <= 5; s++) filters.push(`class=${s}`); }
  if (opts.price_min || opts.price_max) filters.push(`price=USD-${opts.price_min || 0}-${opts.price_max || 9999}-1`);
  if (opts.property_type && PROPERTY_TYPE_MAP[opts.property_type]) filters.push(`ht_id=${PROPERTY_TYPE_MAP[opts.property_type]}`);
  if (filters.length) params.set('nflt', filters.join(';'));
  return `https://www.booking.com/searchresults.html?${params}`;
}

async function scrape(opts, attempt = 1) {
  const url = buildUrl(opts);
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
    await page.waitForSelector('[data-testid="property-card"]', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const cards = await page.$$('[data-testid="property-card"]');
    const results = [];

    for (const card of cards) {
      if (results.length >= limit) break;
      try {
        const name = await card.$eval('[data-testid="title"]', el => el.innerText.trim()).catch(() => null);
        if (!name) continue;
        const price = await card.$eval('[data-testid="price-and-discounted-price"]', el => el.innerText.trim()).catch(() => null);
        const ratingText = await card.$eval('[data-testid="review-score"]', el => el.innerText).catch(() => '');
        const link = await card.$eval('a[data-testid="title-link"]', el => el.href).catch(() => '');
        const image = await card.$eval('img', el => el.src).catch(() => null);

        const ratingMatch = ratingText.match(/([\d.]+)/);
        const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
        if (ratingMin && rating !== null && rating < ratingMin) continue;

        results.push({
          name, price: price || '—', rating,
          link: link ? link.split('?')[0] : '—',
          image,
        });
      } catch { continue; }
    }
    return results;
  } catch (err) {
    await browser.close();
    if (attempt < 2) {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      return scrape(opts, attempt + 1);
    }
    return null;
  } finally {
    await browser.close().catch(() => {});
  }
}

// Main
const opts = parseArgs();
if (!opts.location) { console.error('Usage: node booking.mjs --location "City, Country" [options]'); process.exit(1); }

const checkin = opts.checkin || defaultCheckin();
const checkout = opts.checkout || nextDay(checkin);
const results = await scrape(opts);

if (!results) {
  console.log(`## Booking.com: ${opts.location} (${checkin} → ${checkout})\n\nNo results — Booking.com blocked or timed out. Try again or use Agoda.\n`);
  process.exit(1);
}

if (results.length === 0) {
  console.log(`## Booking.com: ${opts.location} (${checkin} → ${checkout})\n\nNo hotels found matching filters.\n`);
  process.exit(0);
}

// Output markdown
let md = `## Booking.com: ${opts.location} (${checkin} → ${checkout})\n\n`;
md += `| Hotel | Price/night | Rating | Link | Image |\n`;
md += `|-------|-------------|--------|------|-------|\n`;
for (const r of results) {
  const ratingStr = r.rating ? `${r.rating}/10` : '—';
  const linkShort = r.link !== '—' ? `[link](${r.link})` : '—';
  const img = r.image ? `[img](${r.image})` : '—';
  md += `| ${r.name} | ${r.price} | ${ratingStr} | ${linkShort} | ${img} |\n`;
}
console.log(md);

// --- attribution: record hotel images for the credit/provenance pipeline (mirrors eater/infatuation) ---
if (opts.attribution) {
  const { writeFileSync, mkdirSync } = await import('fs');
  const images = results.filter(r => r.image).map(r => ({ url: r.image, sourcePage: (r.link && r.link !== '—') ? r.link : buildUrl(opts) }));
  if (images.length) {
    const dir = String(opts.attribution).replace(/\/?$/, '/');
    mkdirSync(dir, { recursive: true });
    const file = `${dir}attribution-booking-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.json`;
    writeFileSync(file, JSON.stringify({ siteName: 'Booking.com', images }, null, 2));
  }
}
