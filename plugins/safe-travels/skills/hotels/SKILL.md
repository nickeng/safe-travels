---
name: hotels
description: Disabled
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Hotels

Playwright-based hotel search (Booking.com, Agoda). Find hotels in an area. Returns name,
price, stars, neighborhood, link, image.

## Commands

```bash
# Search: find hotels in an area (Booking + Agoda in parallel)
node ${CLAUDE_SKILL_DIR}/scripts/hotels.mjs --location "Shinjuku, Tokyo, Japan" --checkin 2026-04-01 --checkout 2026-04-05 --stars 4

# Save image attribution (per-image credit/provenance) alongside the search
node ${CLAUDE_SKILL_DIR}/scripts/hotels.mjs --location "Shinjuku, Tokyo, Japan" --checkin 2026-04-01 --checkout 2026-04-05 --attribution research/
```

## Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--location` | *required* | City, neighborhood, or area — always include country |
| `--checkin` | +60 days | YYYY-MM-DD |
| `--checkout` | checkin+1 | YYYY-MM-DD |
| `--adults` | 2 | Guest count |
| `--currency` | USD | ISO 4217 |
| `--price_min` | — | Min per-night price |
| `--price_max` | — | Max per-night price |
| `--stars` | — | Minimum star rating (1-5) |
| `--rating_min` | — | Minimum review score |
| `--sort_by` | rating | `price` \| `rating` \| `distance` |
| `--property_type` | — | `hotel` \| `apartment` \| `hostel` \| `boutique` \| `ryokan` |
| `--limit` | 10 | Max results per platform |
| `--platform` | all | `booking` \| `agoda` \| `all` |
| `--attribution` | — | Directory to write image attribution JSON (`{siteName, images:[{url, sourcePage}]}`), so hotel images carry proper credit/provenance in the final guide. Pass `research/`. Forwarded to both parsers. |

## Output example

```markdown
## Booking.com: Colmar, France (2026-07-30 → 2026-07-31)

| Hotel | Price/night | Rating | Link | Image |
|-------|-------------|--------|------|-------|
| Hotel Le Colombier | $230 | 8.9/10 | [link](https://...) | [img](https://...) |
| ibis Budget Colmar | $72 | 7.2/10 | [link](https://...) | [img](https://...) |
```

## Workflow guidance

1. **For big cities:** search per-neighborhood, not the whole city.
   `--location "Shibuya, Tokyo, Japan"` not `--location "Tokyo"`.
2. **Always include country** in location (Booking fails on ambiguous names).
5. **No dates specified?** The skill uses +60 days as default. Prices are approximate
   but representative of typical rates (avoids last-minute surge pricing).

## Gotchas

- **Booking.com may block intermittently.** Agoda results are usually sufficient.
- **Agoda resolves location via API.** Sub-areas (Shinjuku, Shibuya) work — the script
  auto-detects districts and uses city+district params.
- **Images are hotlinked CDN URLs.** Copy verbatim — never modify.
- **Prices are per-night before taxes** unless the price string says otherwise.
- **First run installs ~80MB** (playwright + chromium). Subsequent runs: ~10-15s per platform.
