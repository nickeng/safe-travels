# Seasonal tabs

**The concept: each tab is "this place in this season."** Switching should feel like opening a
different guide — different photos, different places, different map, ideally a different design —
not toggling a filter on one guide. **Boot into one season** (the most iconic, or the one the user
asked about); never show an "all seasons" mash-up (it mixes contradictory prose and photos).

## What the scaffold gives you (and what you add)

The scaffold provides the **state and the filtering primitives**, but not the switcher. It has one
state variable, `activeSeason`, and `render()`, `galleryHTML()`, and `applyMarkerFilters()` all filter
through it via the `inSeason()` helper. While `activeSeason` is `null` (a non-seasonal guide), every
filter is a no-op.

What you add for a seasonal guide: (1) tag the data, (2) a `setSeason()` function + a switcher control
that calls it, (3) the static-prose CSS rules, and (4) the hero/accent swap inside `setSeason`. You do
**not** touch `render()`/`galleryHTML()`/the map — they already read `activeSeason`.

## 1. Tag the data by season (in the `guide-data` block)

- **Item `season`** — which season(s) a place belongs to. `inSeason()` accepts three shapes:
  - a **string** (`"season":"spring"`) → a place that only belongs to one season (hidden otherwise);
  - an **array** (`"season":["spring","winter"]`) → a place worth visiting in several seasons — it
    stays visible in each. **Multi-season items MUST use an array**, not a comma-string;
  - **omitted** → a year-round place, shown in every season.
- **Image `season`** — which season each photo represents. This is what makes the *same* card show a
  roaring spring waterfall on the Spring tab and a frozen one on Winter. Tag every image; an untagged
  image shows in all seasons.

```jsonc
// A place worth seeing in two seasons, with a different photo for each — ONE item, no duplication:
{ "id":"yosemite-falls", "category":"do", "section":"do", "name":"Yosemite Falls",
  "lat":37.756, "lng":-119.597, "season":["spring","winter"],
  "images":[ { "url":"…thunder.jpg", "label":"Spring snowmelt roar", "season":"spring" },
             { "url":"…frozen.jpg",  "label":"Frozen in January",   "season":"winter" } ] }
```

Model each place once and vary its **images** by season — don't duplicate the item per season (that
copies name/coords/sources and stacks map pins). Only genuinely season-exclusive places get a single
`season` string.

## 2. Season-conditional static content (`.only-<season>`)

The tags above cover the data-driven cards, galleries, and map pins. For hand-authored prose that
lives directly in the HTML — a per-season intro paragraph, a callout, a section sub-lead, a whole
day-trip stop, or even one clause inside a shared sentence — use the CSS pattern `setSeason` enables:

1. Wrap it in `class="only-<season>"` (composes with any other classes; block or inline:
   `<div class="only-spring callout">…</div>`, `<span class="only-winter">…</span>`).
2. In the CSS, add one hide-rule per **mismatched** pair — `body.season-<x> .only-<y> { display:none }`
   for every `x ≠ y`. `setSeason` puts `season-<active>` on `<body>`, so that's all it takes.
   For four seasons that's 12 pairs; group them in one rule list.

Rule of thumb: **data-driven cards / gallery / map pins → the `season` data tag; hand-authored prose
that shouldn't appear outside its season → `.only-<season>`.**

## 3. Add `setSeason` and a switcher

The scaffold expects a `setSeason(s)` but doesn't define it — add it. It sets `activeSeason`, swaps the
`body.season-<x>` class (which drives the `.only-<season>` prose), re-renders the cards + galleries,
re-filters the map, and swaps the hero + accent so the whole guide changes. It relies on
`activeSeason`, `render()`, and `applyMarkerFilters()`, all already defined in the scaffold's module
script — paste `setSeason` into that same script:

The per-season hero + palette go in `guide-data`, a top-level `heroes` key beside `items` — this is
what gets each season's hero image attributed and validated:

```jsonc
"heroes": {
  "spring": { "img":"…cherry.jpg", "alt":"Blossoms over the canal", "accent":"#e8a0b8" },
  "winter": { "img":"…snow.jpg",   "alt":"The temple under snow",   "accent":"#7fa8c9" }
}
```

```js
const HERO = DATA.heroes || {};
function setSeason(s){
  activeSeason = s;
  document.body.className = document.body.className.replace(/\bseason-\S+/g, '').trim();
  document.body.classList.add('season-' + s);
  const h = HERO[s];                 // swap hero + accent so each tab reads like a different guide
  if (h){
    const img = document.querySelector('.hero img');
    if (img){ img.src = h.img; img.alt = h.alt; }
    const cr = document.querySelector('.hero .credit');
    if (cr){ cr.dataset.src = h.img;
      const a = ATTRIBUTION[h.img];   // same lookup the one-shot loader uses
      cr.textContent = a ? (a.credit ? `${a.credit} · ${a.siteName}` : a.siteName || '') : new URL(h.img).hostname.replace('www.','');
    }
    document.documentElement.style.setProperty('--accent', h.accent);
  }
  render();              // cards + per-season images
  applyMarkerFilters();  // per-season map pins
}
```

The only contract for the *control* is that it calls `setSeason('<season>')` and one season is active
on load. Tabs are the natural default — style them as part of the destination's identity — but a
`<select>`, a segmented control, or clickable season cards all work:

```html
<div class="season-tabs" role="tablist">
  <button role="tab" data-season="spring" aria-selected="true">Spring</button>
  <button role="tab" data-season="winter" aria-selected="false">Winter</button>
</div>
```
```js
const tabs = document.querySelectorAll('.season-tabs [data-season]');
tabs.forEach(b => b.addEventListener('click', () => {
  tabs.forEach(t => t.setAttribute('aria-selected', t === b));
  setSeason(b.dataset.season);
}));
setSeason('spring');   // BOOT into the iconic season — never leave it unset
```

## 4. Make it feel like a different guide, not a filter

The hero + accent swap in `setSeason` is what sells the concept — reach for it, don't skip it. A
switch should change the photos, the places on the map, and the palette together (cherry pink → maple
red → snow blue), so each tab reads like its own guide for the same place. Anything else that changes
with the season — a different climate strip, a seasonal special-days callout — can hang off the same
`body.season-<x>` class via `.only-<season>`.

## The result / failure check

Switching a tab should change the photos, the places, the map pins, and the palette — it should read
like a different guide for the same place. If a switch only hides a few cards while the hero, colors,
and images stay put, either the item/image `season` tags are missing or `setSeason` isn't swapping the
hero/accent.

## Season cards

In the opening, one card per season, conveying what the season is like so a reader
can compare and choose; clicking one sets the season without scrolling. Optionally add a brief
recommendation.
