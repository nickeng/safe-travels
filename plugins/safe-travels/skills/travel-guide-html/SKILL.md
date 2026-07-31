---
name: travel-guide-html
description: Compose a self-contained single-file HTML travel guide from researched destination data.
user-invocable: false
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/*)
---

# Travel Guide HTML

Compose ONE self-contained `guide.html` that captures the *feeling* of the destination — a
travel-magazine feature, not a data dump. Hold two things at once: **bold, location-specific design**
(you own this — be inventive) and **reliable, image-rich rendering** (use the data-driven mechanism
below — don't improvise it).

## Design mandate

Create a design concept that captures the *feeling* of being in THIS place in THIS season, carried through the whole page. No two guides should look the same. Someone should be able to tell which city the guide is for from the design alone, without reading a word.

Ask two questions before designing:
1. **What is this place made of?** Its architecture, materials, patterns, light, signage.

2. **Does this place have a signature design tradition — a style it's instantly recognized by?**
   (e.g. Talavera tilework for Puebla, tartan for the Highlands, sometsuke porcelain for Arita,
   hand-painted signage for Havana.) If so, reference it; it's already the place's visual identity.

Then commit to a bold aesthetic direction and execute it with precision. Aim for immersive depth, clear focal points, and conceptual cohesion.

### Examples (this is the MINIMUM bar — your guide should be at least this immersive)

These examples show the level of structural design detail every guide needs. Each one has custom
separators, heading treatments, nav identity, background choices, and card styling specific to each
destination. A guide that only picks colors and a font without these structural details is not finished.

#### Example 1: Hong Kong — the signboard canyon

**Elements chosen:**

- Colors: the Kowloon palette — ruby red (#ff2b4d) + warm gold (#ffb52e) leading, warm emerald
  (#3fd873) and warm white as accents, on warm near-black (#0b0908)
- Fonts: Chocolate Classical Sans (HK's 北魏體 revival — a tube-like signage brush) +
  Barlow Condensed (tall vertical city)
- Nav: 香港 as a small glowing gold neon tag + "HK"
- Section markers: a projecting 招牌 — a dim metal panel framed by a glowing neon border tube with
  large Chinese calligraphy (Chocolate Classical Sans) glowing as its own tube inside; alternating sides of the canyon. Every
  tube is filled near-white with the color blooming in the layered glow around it — the light never
  floats free of a letterform; the section's heading sits beside the sign
- Sub-section labels: a short glowing tube-bar in the section's color
- Cards: lightbox panels — a dimmed neon sign that saturates and brightens to full glow on hover (it "switches on")
- Separators: generous empty space between sections, the dark void between lit signs
- Background: warm near-black with one faint warm radial glow

**What makes it HK:** The glow. On a dark, sparse page the identity is carried by *light* — glowing
Beiwei calligraphy on its lit signboard — the way neon 招牌 read against the black void of the street.
The ruby, gold and emerald hues are the colors of the trades that filled those canyons — pawnshops,
gold dealers, restaurants, herbalists.

#### Example 2: Marrakech — ornamental density

**Elements chosen:**

- Colors: warm ochre tadelakt plaster ground (#f0e0c8) with zellige jewel accents — cobalt
  (#1a4e80), emerald-teal (#1a6b5b), saffron (#cf982b), terracotta (#b9542f)
- Nav: opaque plaster, a khatim star mark in cobalt/teal before the Arabic, zellige diamond course
  as the bottom border (the feature band's `conic-gradient` scaled to a 6px tiled strip)
- Section headings: centered Marcellus with an Arabic Amiri subtitle in saffron, flanked by
  carved-plaster rules that terminate in a cobalt lozenge ringed in saffron; Mukta for body
- Feature band: a CSS zellige diamond field — a `conic-gradient` harlequin of cobalt/teal diamonds
  with saffron studs, framed top and bottom by a straight terracotta+saffron tiled border course
- Cards (riad doors): cream cards with the image clipped to a soft pointed arch and a saffron keystone
  "crown"; a hard-edged midday shadow that lengthens on hover
- Background: sebka net as a faint terracotta-on-plaster page texture (~1.10:1)
- Opening: drop-cap lead + saffron-bordered spice-label stat chips

**What makes it Marrakech:** Ornament on every surface — sebka behind the text, zellige across the nav
and the feature band, carved-plaster rules on every heading, arched riad-door cards with hard noon
shadows. The density of the medina itself, in warm plaster and daylight.

#### Example 3: Lofoten — two lights, one archipelago (Seasonal tabs)

**Elements chosen:**

- Colors: two seasonal palettes — WINTER: aurora green (#5fe3ab) + glacial ice-blue (#7fcdeb) on
  polar-night blue-black (#0b1420); SUMMER: midnight-sun orange (#ff9d54) + gold (#ffce6e) on warm
  dusk brown (#191106). One constant in both: rorbu-cabin red (#a8322a)
- Fonts: Fjalla One (a tall, quarried display face — peaks standing up), Schibsted Grotesk (body), and IBM Plex Mono for the data readouts
- Nav: a tiny red rorbu gable (CSS clip-path) beside a season-specific name — Mørketid (the
  polar-night) in winter, Midnattssol (midnight sun) in summer
- Section headings: Fjalla One with one accent-colored word; a mono kicker above
- Separators: a jagged granite peak-silhouette strip — the serrated skyline seen across the water,
  with the cold sea-line running under it
- Cards: dark panels that glow in the season's accent on hover
- Background: a slowly drifting radial glow (animated) — the aurora in winter, the
  midnight-sun haze in summer
- Data: temperature and daylight hours displayed in bars for each season

**What makes it Lofoten:** One place, two opposite atomospheric shows — so the whole page flips
between them. At 68°N the single fact that shapes the trip is light: long polar nights vs. endless
summer days — so the light and temperature budget is charted up front, and the palette, glow
and hero swap with the season.

#### Example 4: Yosemite — WPA park poster

**Elements chosen:**

- Colors: a muted forest-green (#404f38) ground with a limited, matte screenprint palette drawn from the
  landscape — meadow gold (#d19a3f), alpenglow amber (#cf7233), granite lavender (#9d9ab9) and a dusty
  sky blue (#9cc0d4), printed in cream (#eae2c6)
- Fonts: Anton (display), Archivo Narrow (labels), Archivo (body) — condensed poster lettering
- Nav: The park name in Anton, "Est. 1890"
- Section markers: the section's own routed NPS wooden trail sign, printed flat in the poster's ink — a bold, solid dark brown plaque with cream caps and a carved directional arrow (→)
- Sub-section labels: uppercase Anton with a small flat ink block in the section's color
- Cards: flat mini-posters on cream poster paper — a clean ink keyline and a hard, flat offset
  ink shadow on hover (no blur)
- Background: a faint light halftone grain over the green ground — the silkscreen tooth
- Data: a waterfall-flow-by-month bar chart

**What makes it Yosemite:** The design tradition. The National-Park WPA serigraph poster is the park's own
visual language — flat, simple, matte inks, hard-edged — and it governs every element. Its
colors are drawn from the landscape itself. The page reads like a 1930s interpretive guide
updated for the web.

#### Example 5: Santorini — blinding white + one blue

**Elements chosen:**

- Colors: pure white (#ffffff) background + one deep Aegean blue (#1560a8). Only two colors on the entire page.
- Nav: a gradient blue stripe across the top (the sea above the cliff), then white below with
  "Santorini" in thin serif + "Σαντορίνη" in blue
- Section headings: Cormorant weight-300 at 2.2rem — large, thin, carved-into-stone feeling. No
  underline, no ornament. The whitespace around them IS the design.
- Cards: white with a directional offset shadow (sun casting hard shadows off white buildings)
- Separators: a tiny CSS half-circle dome shape (20px wide, blue, half-rounded — the abstracted
  church dome) and a 1px gradient line fading transparent→blue→transparent (the caldera rim)
- Background: pure white with barely-visible plaster noise texture (whitewashed walls)
- Stats: enormous thin blue serif numbers floating in white space — no boxes, no borders

**What makes it Santorini:** The emptiness. Almost nothing is on the page — white space, thin type,
one blue. The design is what's *not* there, like the stark white buildings against infinite sky.
Every element is reduced to its minimum: a dome becomes a 20px half-circle, the caldera becomes a
1px fading line, a heading is just thin letters in air.

### Design principles

- Create a color palette that captures the destination — background, accent, and text colors
  should all feel like they belong to this place. Prefer light backgrounds — dark works when
  the place's dominant color IS dark (e.g. volcanic rock, canyon sandstone).
- Use the name locals use for their city — not airport codes or invented abbreviations.
- Magazine-scale headings driven by typographic hierarchy alone — scale contrast, weight contrast,
  color accent on one word, or generous whitespace. A heading that needs a line underneath isn't
  dramatic enough.
- A recurring signature device drawn from the place — a separator, a motif, a treatment, a shape — is the usual way to make sections cohere.
- Generous negative space between sections — or controlled density when the destination demands it.
  Both extremes work; timid middle-ground spacing does not.
- When using both decorated headings and section separators, ensure they look distinct from each
  other — two similar-looking lines stacked together reads as a mistake.
- Avoid generic character separators (◆ ◆ ◆, · · ·, ✦ ✦ ✦) — they add nothing and signal a
  lack of commitment. If a section needs a break, use whitespace or a destination-specific motif.
- Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- Execute your chosen aesthetic fully — a minimal design needs precision and careful spacing;
  an ornamental design needs layers and density. Don't half-commit to either direction.
- Every design choice should reflect this specific place — prefer local aesthetics over well-known
  national ones. Avoid common national colors and motifs (e.g. torii red, chinese seal) unless
  they're genuinely rooted in this city.

### Design DNA (complete before writing CSS)

Before writing any styles, identify:
- **Surface:** What is this place's dominant physical material/texture?
- **Tradition:** Does a design tradition already exist for this place?
- **Form:** Is there a single architectural shape that signals this place?
- **Light:** What's the quality of light — golden, gray, neon, harsh white?
- **Season/theme:** If the trip is defined by a season or theme, how does THIS place express it?
- **Identity test:** If you swapped the city name, would the design need to change?

### Background texture & design motifs

Does the destination have a surface, craft, flora, or architectural form you could photograph
close-up and someone would recognize the place? If yes, abstract it into CSS or inline SVG:

- A surface designed to cover large areas (e.g. tilework, jali screens, woven textiles) → works as a
  full-page background texture on `#content` or on callout blocks. You MUST read
  `references/background-pattern.md` before building one.
- A border or linear motif (e.g. stepped frets, geometric tile strips, bunting) → works as a section
  separator strip, not a full-page texture (it loses its form when tiled in both directions).
  CSS gradients can work as well as SVG here.
- A single recognizable natural or architectural form (e.g. a mountain, an arch profile, a roofline) →
  render as a small SVG or CSS shape used as an accent or separator — abstract yet recognizable at small scale.

After choosing a motif, reproduce the specific features that make it recognizable — its real colors if it's known by color, its shape or silhouette if it's known by form.

### Verify before writing content

- [ ] Nav carries identity beyond the city name (e.g., local script, a distinctive mark)
- [ ] Headings are styled as part of the destination's identity
- [ ] If using a pattern or motif, it's recognizable as its source without a label
- [ ] If using a tiled background pattern, it follows the guidelines in `references/background-pattern.md`
- [ ] Swapping the city name for a different destination would require redesigning structural CSS
- [ ] Fonts are distinctive

## The guide's structure

The always-present backbone of every guide:

1. **Hero** — full-bleed image, kicker, large title, evocative one-liner. Always include a
   `<span class="credit" data-src="<image-url>"></span>` — attribution is filled automatically.
2. **The opening** — every guide opens by orienting the traveler to THIS place at THIS time, then
   flows into the sections. It includes:
   * Lead with a drop cap (`::first-letter`), not a section heading.
   * The weather that shapes the trip: what to pack, what's accessible, what light to expect.
   * The practical must-knows: key facts, getting around, money, booking windows, and anything specific to this traveler.
   * A recommended itinerary or trip length, with brief reasoning.
   * Reach for a data graphic when it earns its place — a climate chart for a "when should I go?" trip, a timeline when you're timing a bloom or the autumn color, or an access-window timeline when seasonal road/pass closures gate the trip. See `references/data-graphic.md`.
3. **Special days** *(conditional)* — when a qualifying occasion (a holiday, community celebration, or
   seasonal happening) falls in the window — or, for an open-ended trip, across the year — it's often
   the single best reason to time a trip: feature it prominently and, if it has a timed program or
   spans distinct days, render its schedule/calendar as a visual, not prose. If none qualifies, omit
   this section — don't force or pad it. See `references/special-days.md`.
4. **Sections** — the editorial spine between the opening and the map; card grids via the data-driven
   loop (each `.cards[data-section]` claims items whose `section` matches). How they're arranged is
   yours — see **Composing the sections**.
5. **Map** — Leaflet, no-token tiles (CARTO light/dark or OSM). Markers colored from `--c-*` vars, a
   category filter (toggle chips), popups with the item's primary image, fitBounds — only items with
   coordinates get markers. Below the map, a "Save map to file" button exports selected categories as
   .gpx (client-side from `ITEMS`). See the scaffold for the implementation.
6. **Sources & credits** — close with a credits section linking the sources the research drew on,
   each to its original URL, plus image attributions. A reader should be able to trace a claim back
   to where it came from. Add a brief, honest note (phrased naturally) that photos are hotlinked from
   the linked sources and remain their authors' property — per-image credit is in the lightbox. At the
   very end of the section, add "Safe travels!".

## Composing the sections

The sections between the opening and the map are the one part of the guide whose *arrangement* is
yours. Start with the default spine that best fits the shape of the trip and adjust or mix as needed:

- **Single hub** — one base explored outward: see & do → eat → stay → optional add-ons.
- **Route / legs** — a journey between bases, one section per leg. See `references/route-guide.md`.
- **Neighborhoods / regions** — when *areas* are the spine: a city organized by the neighborhood,
  or a base whose appeal is the regional day-trips around it. Each region gets its own section; the base stay and optional addons come after everything else.

Across every spine:

- **Lead with what's distinctive; keep essentials last.** The reason to come goes first (often as a
  feature band); the do/food/stay defaults catch everything without a stronger home.
- The mappable places rendered as **place cards** (they become the map pins); everything else is
  **content** you write around them.
- **Everything in the suggested itinerary should be placed above stay** — a day-trip or
  excursion from your base included in the itinerary belong near see&do. Optional add-ons not in the itinerary go at the end after stay.

### Section hierarchy

When a section holds several cohesive threads, split it into themed groups by whatever is most
meaningful to the reader (neighborhood, cuisine, photographic subject, time of day, weather
conditions) — as a sub-section, a separate section, or a feature band. Give each its own heading and a
point-of-view lead so it reads as editorial and earns its own reason to stop, with its own place cards —
not one lead over a pile of grids.

- **Sub-sections** — threads that cohere under the one section's banner. Up to three per section; if you
  need more, split into multiple sections.
- **A separate top-level section** — a thread with enough distinct character to stand beside its
  neighbours, in the same register, with its own narrative lead.
- **A feature band** — a section lifted into in its own distinctive styling (a dark band on a light page, or
  vice versa) carried by a narrative lead. Reserve for the 1–2 things that truly define the trip —
  the biggest reason to go: the thing the destination is genuinely known for, that most shapes
  why people go there.

Break any block past ~6 cards; sub-divide only when most sub-sections hold ~3+ cards.

### Emphasis, rhythm, and variety

A section that is only a grid of place cards reads like a database,
not a guide — give the reader a reason to **stop**. A reader skims before they read, so the deciding
and most-interesting content must carry visual weight, or it's scrolled past however well-written.
Give it emphasis at whatever scale it needs:

- **Bold or color accent a key phrase** inline, so a skimmer's eye catches it.
- **A callout** — a short note pulled out and emphasized in the flow: a local tip, or a cultural /
  how-to point.
- **A sidebar** — a self-contained block set beside the main text: a comparison `<table>`, a scannable
  "what to order" list of dishes, a key-terms panel, at-a-glance facts. Structured and quick to read.
- **A data graphic** — when the thing worth stopping on is quantitative or time-based (e.g. climate, a
  bloom/foliage, crowds), render it as a small CSS chart, never a
  paragraph — a reader takes in "tulips peak mid-April" from a bar instantly but skims it in prose. Use your own knowledge for well-known
  figures; cite only when precision matters. See `references/data-graphic.md`.
- **A feature card** — a grid-breaking larger card for THE one unmissable place (`feature:true` in `items`);
  ~1–2 per guide, and don't nest one inside a feature band unless it's the only item.
- **A two-column movement** — a reading-width narrative beside a companion: a sidebar, one strong place
  card (a grid may hold a single item), or a data graphic.
- **A feature band** — a defining section in its own register, where the change of register itself is the break. The section can also have unique borders or background pattern.

### Category specifics

Each category has its own natural shape:

- **See & do** — group by topic; a strong section is a set of topical groupings, not one long grid. Break into multiple sections as needed.
- **Food** — surface seasonal/day-of-week availability as a tag ("winter only", "closed Sunday"). Group
  the places to eat around what's most distinctive about eating there (venue type, occasions,
  neighborhood, or cuisine); a long set rides in a rail. Where the food culture is real, lead the section
  with it — see `references/food-culture.md`.
- **Stay** — default to a single rail of places to stay; split into two rails only on a genuine decision
  (where you base, or what kind of stay), never a sort by price or rating. Each stay's blurb carries its
  type and price. Where the base shapes the trip,
  lead the section with the base options to help the reader choose — see `references/neighborhoods.md`.
- **Day-trips** — Day trips get mini-guide depth — prose, stop lists, transport, tips. See `references/day-trips.md`.

## Module library

Optional modules live in `references/`, each covering how to build one feature in depth. Before you
start writing, scan this table against the research and the user's request, note which modules are
relevant to the trip, then read ALL those files before building their sections.

| Module             | Use when                                                     | File                               |
| --- | --- | --- |
| Data graphic       | A quantitative or time-based fact worth a chart (climate, a bloom/foliage or road-open window, daylight timing) | `references/data-graphic.md`       |
| Food culture       | Destinations with food depth (most cities) — the culture of eating there, the dishes to try, and how locals eat | `references/food-culture.md`       |
| Neighborhoods (Stay Section) | A city where the neighborhood you stay in shapes the trip | `references/neighborhoods.md`     |
| Hikes              | Experiences include real hikes/trails                        | `references/hikes.md`              |
| Hover glossary     | Content sections use non-English terms                       | `references/glossary.md`           |
| Seasonal tabs      | Destination has distinct prime seasons (user asks)           | `references/seasonal-tabs.md`      |
| Day trips          | Rendering day trips                                          | `references/day-trips.md`          |
| Route guide        | Trip is a journey between places (road trips, multi-city, island-hopping) | `references/route-guide.md`        |
| Special days       | A holiday/celebration/seasonal happening is worth timing around (in the window, or across the year for open-ended trips) | `references/special-days.md`       |
| Packing list       | Destination has non-obvious packing needs (weather, altitude, gear, dress) | `references/packing-list.md`       |
| Background pattern | Creating a background motif or texture                       | `references/background-pattern.md` |

## Required: Data-driven rendering

Build place cards from ONE data array + a render loop — NEVER hand-write static `<article>` place cards,
and NEVER keep a second parallel markers array. This is what makes images render reliably: the loop
emits every image in each item's `images[]` via `galleryHTML()`.

**`scaffolds/data-driven-guide.html` is the canonical reference — study it first and reproduce its
mechanism** (its styling is deliberately plain; redesign all visuals). It wires, from a single
data block:

1. The `<script type="application/json" id="guide-data">` block's `items` array, from the
   researchers' markdown — the scaffold shows the default item shape. **Copy image URLs verbatim.**
   - **`category`** — the pin's map color + filter chip + GPX export. Default palette: `do` (things
     to see & do), `food`, `stay`.
   - **`section`** — editorial routing for place cards: the mount (its `data-section`) this card renders
     in. Many sections can share a `category` (e.g. `food` → `food-soul`, `food-sea`); name a section
     per the editorial spine you're building (see **Sections**).
   - `description` = the "What:" field (1–2 sentences, <250 chars);
   - `sources` = the "Sources:" URLs + short title.
2. `galleryHTML(images)` — 1 image → plain image; >1 → a carousel (‹ › arrows + dots that
   cycle inline). No text overlay on the image — labels and credits show only in the lightbox.
   Clicking the image opens a cycling lightbox (← →, counter, Esc).
3. `render()` — fills each `.cards[data-section]` mount by matching `item.section`, via
   `galleryHTML(item.images)`.
4. Map markers built from the SAME `items` (colored by `--c-<category>`), card↔marker sync, the map
   split view, and a category filter — all reading that one array. Route guides add an optional
   `ROUTE` polyline through the leg hubs.
5. **Clickable content images** — editorial images outside ITEMS cards (e.g. day-trip photos, holiday
   images, feature shots) get `data-lightbox` so they open in the lightbox with attribution.
   Images that belong together (multiple photos of the same day trip or event) share a group name:
   `<img data-lightbox="group-name" src="..." alt="...">`. The scaffold handles cycling and
   attribution lookup. The hero is the exception — it uses a `.credit` overlay instead.
6. **Map items in content** — a place in `items` (so it has a map pin) that you render *outside* a
   card grid carries its `id` as `data-id` (e.g. `<article data-id="north-beach">…</article>`), so
   its marker still scrolls to it, highlights it, and hovering opens the pin. These items have no
   card, so they skip `section`.
7. **Image attribution (lightbox)** — the scaffold includes an empty `<script type="application/json"
   id="attribution-data">{}</script>` island, parsed into `ATTRIBUTION`, which `drawLB()` reads to show
   photographer, source site, and license links in the lightbox caption. It's populated post-compose
   by `inject-attribution.mjs` — you don't fill it manually; just include the empty island as shown in
   the scaffold.

Everything visual (palette, fonts, card shape, hero, layout, section order) stays yours. The data
shape + render loop is the reliable floor, not a template.

## Required: Map split view

EVERY guide MUST include a **map split view**, toggled by a **◂ Map** / **Close ▸** control in the guide's **sticky top nav**. It switches the same content between two layouts:
- **Default reading layout** — editorial flow: full-width sections, multi-column card grid, map as a
  normal block near the end.
- **Split view open** — a TRUE half-page split: the map is fixed to the right half of the viewport
  (full height) while content fills the left `50vw` and scrolls beside it. Use card↔marker sync
  here (hover a card → opens its marker; click a marker → scrolls to its card).

Implementation (see `scaffolds/data-driven-guide.html`):
- Put ALL reading content (nav, hero, every section) inside ONE wrapper, e.g. `<div id="content">`;
  the map is OUTSIDE it, wrapped: `<div class="map-container"><div id="map"></div></div>`.
- Drive the toggle with a `body.split` class (zero the margin, or `top:0` is offset by
  any base `margin-top` and the map overlaps the nav). In Read mode both are in-flow.
  Use `%` for `#content` (avoids scrollbar overlap) and `vw` for the fixed map (fixed elements are
  relative to the viewport).
- **Position the `.map-container` WRAPPER, never `#map` directly.** Leaflet puts an inline
  `style="position:relative"` on the `#map` element, and inline styles beat the stylesheet, so
  `body.split #map{position:fixed}` is silently ignored — the map then renders below the article.
- Constrain the ONE content wrapper, never individual blocks (a block outside it stays full-width and
  overlaps the map).
- Call `map.invalidateSize()` after toggling so Leaflet re-renders.
- ≤900px: map fixed to the top ~1/3 of the viewport, content scrolls below it. Set `nav{top:33vh}`
  so the sticky nav sits below the map, not under it.

## Modern web APIs

Use the most modern HTML/CSS/JS available, provided it has shipped in the current version of all major browsers. Prefer:

| Prefer | Over |
|---|---|
| `<dialog>` + `showModal()` (the lightbox, any modal) | custom modal `<div>` + manual show/hide |
| `popover` attribute | custom popover JS |
| CSS `:has()`, nesting, `color-mix()`, container queries | older selector/JS workarounds |
| `URL` / `URLSearchParams` | manual string parsing |

- Inline scripts MUST use `<script type="module">`. Note module scope is NOT global, so inline
  `onclick="fn()"` / `onchange="fn()"` attributes that call your functions will fail — wire those with
  `addEventListener` instead. (Inline `onerror="this.style.opacity=.2"` on images is fine — it only
  uses `this`.)
- `<dialog>` gives you Esc-to-close and focus handling for free; keep arrow-key navigation via a
  `keydown` listener guarded by the dialog's `open` property.

## Rules

- SINGLE `.html`: inline CSS + JS; only map tiles, fonts, and Leaflet via CDN.
- Images: hotlink with visible credit (author's own preferred); graceful `onerror`. Some 403 — ok.
- Embedded JS only where it informs (map, filter, tabs, lightbox, card↔marker). Respect
  `prefers-reduced-motion`.
- Show missing-data gaps as a quiet muted footnote, never a colored callout box.
- Palette as role tokens on `:root` (`--bg`, `--text`, `--muted`, `--accent`, `--line`, …): components
  read tokens for shared text roles; a section with its own background (e.g. a feature band)
  re-assigns them for its register. Literal colors are for one-off signature elements.
- Accessibility: alt text, sufficient contrast, semantic headings.
- External links open in a new tab. All `<a>` to source articles, booking sites, etc. get
  `target="_blank" rel="noopener"`. The guide itself stays open.
- Write `guide.html` INCREMENTALLY (`<head>` first, then append
  each section) so no single write is too large to complete.

## Validate before finishing (do not skip)

After writing `guide.html`, run the validation script:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/validate-guide.mjs" guide.html
```

It checks JS syntax, HTML structure, image count and duplicates, required mechanisms, banned fonts, and
verifies all image URLs are reachable. Fix any reported ERRORS before delivering.
WARNINGS are worth reviewing — for broken images: 404/timeout → remove from the item's `images`
array (if no images left, keep as text-only card); 403 → leave it (hotlink protection, `onerror`
handles it). Duplicate images across items → deduplicate or remove.

## Inject attribution (after validate)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/inject-attribution.mjs" guide.html --dir research/
```

Fills the `#attribution-data` island from the research folder's `attribution-*.json`, joined to the
guide's images by URL.

## Gotchas

- **Image URLs verbatim.** Emit each `src` exactly as the researcher gave it — never retype, shorten,
  or pad a filename from the place's name; a reconstructed URL 404s.
- **Use `id="map"` for the Leaflet div only; anchor the map section with a separate id (e.g.
  `#map-section`) and point nav links there.** This keeps `L.map('map')` / `getElementById('map')`
  resolving to the real map div — if a heading or section also carries `id="map"`, it's matched first
  and the map initializes on the wrong element.
- **Keep custom state off Leaflet objects — track marker filter state in a parallel object and use
  `map.hasLayer()`.** Assigning `m._on` / `m._map` on a marker overwrites a Leaflet method and throws
  `this._on is not a function`.
- **Scope the card render to `.cards[data-section]`**, not a bare `[data-section]` — the latter also matches
  the filter buttons and injects cards into them.
- **Heading decorations and text width:** if positioning lines or accents relative to a heading,
  make the element `display:inline-block` so it shrinks to its text — then position decorations
  from its edges (`right:100%`, `left:100%`, `width:100%`). Avoid `calc(50% + Npx)` which assumes
  fixed text width.
- **SVG motifs:** recognizable shapes need accurate proportions and enough vertices to
  capture the outline — a simplified shape that loses its defining ratios is unrecognizable. Iterate on the path geometry several times before finalizing.
