---
name: eater
description: Disabled
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Eater Best-Restaurants Extractor

Turns an Eater (eater.com) map page into a curated restaurant list with real coordinates, price, "open for" meal-time hints, websites, and blurbs.

## Usage

**1. Search Eater for the city's list pages.** `[MAP]` marks pages this skill can parse; a city
usually has several — a general city map (titled "best of" or "essentials") plus specialty maps.
Search by the place alone (`<city>, <country>`), not "best restaurants <city>": the bare city
surfaces the full range of maps and avoids off-city false positives. Include the country to
keep the ranking clean.

```bash
node ${CLAUDE_SKILL_DIR}/scripts/eater.mjs --search "paris, france"
```

```
# Eater search: "paris, france"  (2040 total matches)

  [MAP] The 38 Best Restaurants in Paris, According to a French Food Expert
         https://www.eater.com/maps/best-restaurants-paris-france
         Eater's Paris dining expert shares the bistros, cafes, and fine dining restaurants ...

  [MAP] The 15 Best Patisseries in Paris
         https://www.eater.com/maps/best-pastries-paris-france-patisseries

        You Don't Need to Eat a Croissant in Paris        (article, not a map — skip)
         https://www.eater.com/2016/10/19/13331542/paris-croissants-overrated-pastry
```

**2. Fetch and parse the map page(s) you picked.**

```bash
node ${CLAUDE_SKILL_DIR}/scripts/eater.mjs --url "https://www.eater.com/maps/best-restaurants-paris-france"

# Also save image attribution metadata
node ${CLAUDE_SKILL_DIR}/scripts/eater.mjs --url "<eater-map-url>" --attribution research/
```

```
# The Best Restaurants in Paris, According to a French Food Expert
   38 restaurants (38 with coords)

  Juveniles $$ · Open for: Lunch, dinner
     47 Rue De Richelieu, 75001 Paris, France  [48.866245,2.337065]
     This friendly wine bar and bistro is the perfect place to find excellent French comfort food ...
     img: https://cdn.vox-cdn.com/thumbor/.../juveniles.jpg
```

Coordinates are real, so the list feeds a map directly — no geocoding step. Add `--json` for
the complete record per restaurant — adds `website`, `phone`, `mapUrl`, `eaterAnchor`,
and the untruncated blurb — when you need to parse it programmatically.

## Flags

| Flag | Description |
|------|-------------|
| `--search <query>` | List Eater search candidates (title/url/snippet); `[MAP]` = parseable map page. Does not parse. |
| `--url <eater-map-url>` | Parse a specific Eater map page into the restaurant list. |
| `--json` | Emit the complete structured object instead of the summary. |
| `--attribution <dir>` | Write image attribution metadata to a JSON file in `<dir>`. |

Provide either `--search` or `--url`.

## Gotchas

- **Only parses Eater "map" list pages** (the numbered `duet--article--map-card` layout). Regular
  Eater articles return an empty list — parse only the `[MAP]`-tagged results from `--search`.
- **`openFor` is a hint, not structured hours** ("Dinner, drinks. Closed Sunday") — good for
  meal-time context, not a reservation-grade schedule.
- **`priceRange` notation varies** (`$$`, sometimes prose); a few cards may lack it.
- **Coverage** is whatever Eater has published a map for; international coverage is narrower than US.
