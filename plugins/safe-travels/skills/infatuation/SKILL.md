---
name: infatuation
description: Disabled
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Infatuation Restaurants

Search and fetch The Infatuation's restaurant recommendations — ranked, editorially-curated
reviews plus per-restaurant "what to order" guides. Follow the workflow below in order:
each step's output feeds the next.

## Workflow

```
1. cities                  → confirm the city is covered (get its slug)
2. filters --city <slug>   → discover valid cuisines / neighborhoods / vibes for that city
3. search  --city <slug>   → ranked restaurants (filter by the slugs from step 2)
4. guide   --slug <slug>   → "what to order" dishes + prose for a specific spot
```

## Commands

```bash
node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs cities
node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs filters --city paris
node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs search --city paris --cuisine italian --vibe date-night --limit 10

# Save image attribution metadata
node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs search --city london --query bakery --attribution research/

node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs guide --slug dishoom-covent-garden --city london
node ${CLAUDE_SKILL_DIR}/scripts/infatuation.mjs guide --url https://www.theinfatuation.com/london/reviews/dishoom-covent-garden
```

Filter priority for `search` is neighborhood > cuisine > vibe; any extra filters become free-text search.

## Output

`cities` and `filters` return the slugs you feed into `search`:

```
Filters for paris (use these slugs in search):
  Neighborhoods: le-marais, montmartre, saint-germain-des-pres, ...
  Cuisines: french, italian, japanese, wine-bar, ...
  Vibes: date-night, brunch, cheap-eats, outdoor-dining, ...
```

`search` returns a ranked, readable list (rating, price, name, cuisine/neighborhood, blurb, address):

```
/paris + "bakery" — 10 of 343 (more)

  8.5/10 $$ · Du Pain et des Idées · Bakery, 10th Arrondissement
     A revered bakery near Canal Saint-Martin known for its escargot pastries
     34 Rue Yves Toudic, Paris, 75010
     img: https://images.ctfassets.net/.../du-pain-et-des-idees.jpg
```

`guide` returns the dishes to order plus prose:

```
## Dishoom Covent Garden  8.7/10
Perfect for: Breakfast, Groups, Vegetarians

A Bombay-cafe homage that's become a London institution...

What to order:
  • Bacon Naan Roll — the gateway dish; smoky bacon in a fluffy naan
  • Black Daal — simmered overnight, rich and buttery

https://www.theinfatuation.com/london/reviews/dishoom-covent-garden
```

Add `--json` to any command for the complete structured record — for `search` that adds
`website`, `reservationUrl`, and `slugName` per result — when you need to
parse it programmatically.

## Gotchas

- **Undocumented public API** could rate-limit — keep to a few calls per minute, and degrade
  gracefully if `cities`/`filters` return empty.
- **Ratings are often null for non-US cities** (the API uses 0/null as an "unrated" sentinel,
  shown as `–`). For those cities, rank by list order / editorial inclusion, not the score.
- **Not every review has a food rundown** — `guide`'s "what to order" may be empty; the prose
  preview is the fallback.
- **Coverage is finite (~190 cities).** Run `cities` first; small towns (e.g. Colmar) are not
  covered — use travel blogs for those instead.
