---
name: geocoding
description: Disabled
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Tiered Batch Geocoder

Resolves place names and addresses to coordinates. Zero-dependency (native fetch), no API key.
Routing is automatic — US Census for US street addresses, Photon (OpenStreetMap data) for
everything else. Every result carries a **confidence** level based on distance plausibility and
name-match quality.

## Attribution (required)

Results include OpenStreetMap data provided under the ODbL license. Any output that displays
geocoded coordinates MUST include attribution:

> © OpenStreetMap contributors — https://www.openstreetmap.org/copyright

The script includes this in its output. When using coordinates in a final product (e.g. a map),
include the attribution in the sources/credits section.

## Input

```bash
node ${CLAUDE_SKILL_DIR}/scripts/geocode.mjs "Kinkaku-ji, Kyoto, Japan"
```

Batch (preferred) — pipe-delimited lines on stdin via a quoted heredoc, `name | address | city | country`:

```bash
node ${CLAUDE_SKILL_DIR}/scripts/geocode.mjs --batch <<'EOF'
Franklin Barbecue | 900 E 11th St, Austin, TX 78702 | Austin, TX | USA
Kushida Shrine | 1-41 Kamikawabatamachi, Hakata-ku | Fukuoka | Japan
Côte d'Azur Beach |  | Nice | France
EOF
```

Use the quoted delimiter (`<<'EOF'`) so apostrophes and `$` in place names stay literal.

**Field guidance:**
- **city** — for US locations, include the state abbreviation (`Jackson, WY` not `Jackson`).
  Common US city names exist in many states and the script uses this field to establish a
  plausibility centroid.
- **address** — street address if known. US addresses with state + ZIP route to Census
  automatically.
- **country** — plain country name (`USA`, `Japan`, `France`). Not a region or state.

Provide city and country whenever you have them — they are appended to queries for
disambiguation and enable the plausibility guard.

Flags: `--json` · `--radius-km N` (plausibility guard, default 30) · `--country "X"` (default
hint for batch lines that omit it) · `--help`.

## Output

Markdown table with `Source`, `Confidence`, and `Display` columns (or `--json` for structured).

### Interpreting confidence

- **high** — reliable. Census match, or Photon result within city radius with strong name match.
- **medium** — likely correct. Within radius, partial name match.
- **low** — **name mismatch**. The `Display` column shows what the geocoder actually matched.
  Compare it to your query — if they are clearly different places, do not use the coordinate.
- **none** — not found by any provider.

When you see `low` confidence, look at the Display column. If it shows a different place than
what you searched for (e.g. you searched "Kushida Shrine" but Display says "Honey Coffee"),
discard the result — do not put it on a map.

## Gotchas

- **Backoff is built in — do not wrap or parallelize.** The script rate-limits internally and
  retries on throttling. A batch of 20 takes ~10s. Do not add your own retry loop or run it
  through `xargs`.
- **`low` confidence often means confidently wrong, not just imprecise.** Photon fuzzy-matches
  aggressively — it will return *something* even when the place isn't in its database. The
  name-match check catches most of these and flags them `low`. A returned coordinate with `low`
  confidence is not automatically correct.
- **US cities need state context.** Pass `Jackson, WY` not just `Jackson` in the city field.
  Without state disambiguation, the centroid lands in the wrong state and the plausibility
  guard misfires.
- **Census matches street addresses only, never POI names** (US only). Put the street address in
  the `address` field; a bare name routes to Photon instead.
- **Descriptively-named items often return `none`** — e.g. "Sunrise at Mather Point" or "X & Y
  Gardens" are not gazetteer entities. Expect misses for scenic viewpoints, driving routes, and
  activity headings.
- **Block-based addresses (Japan, Taiwan, Korea) need the city field populated.** Ward-relative
  numbers are not globally unique — without city context they won't resolve.
- **A `|` inside a field breaks batch parsing** (it's the field delimiter). Strip or replace
  pipes in place names (e.g. `Bar | Bistro X` → `Bar Bistro X`) before building batch lines.
