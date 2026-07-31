# Route Guide

Use when the trip is a **journey between places** (road trips, multi-city itineraries, island-hopping)
rather than a single destination. The structure changes from category-based to place-based.

## When to use

- The user describes a route ("driving the Wild Atlantic Way", "Nagano → Gifu → Takayama")
- Multiple distinct towns/areas with travel between them
- The journey itself is part of the experience (scenic drives, train rides)

Do NOT use for a single city with day trips — those are still single-destination guides with a
day-trips section.

## Structure: organize by leg

Use: Leg 1 (all places) → Leg 2 (all places) → Leg 3 → Overview Map

Each leg is a self-contained mini-guide for that stretch of the route:

```
Leg 1: {Region/Town Name}
  ├── Intro (what makes this stretch special, the drive itself, ~nights)
  ├── See & Do (attractions and activities)
  ├── Where to eat (restaurants for this area)
  └── Where to stay (accommodation for this stretch)

Transition: what the drive to the next leg is like

Leg 2: {Region/Town Name}
  └── ...
```

## Route overview (before the legs)

Open with a compact route overview that shows the full journey at a glance:
- A list or visual of all legs with estimated nights per stop
- Total trip length and travel time
- Best direction to drive (if it matters)
- Timing callouts if dates are flexible

This gives the reader the shape of the trip before diving into details.

## The drive as content

The transition between legs is NOT just whitespace — it's content:
- How long is the drive?
- What's the road like? (coastal cliff road, mountain pass, motorway)
- Are there must-stop points along the way? (a viewpoint, a roadside pub, a photo spot)
- What changes as you move? (landscape shifts, language shifts, vibe shifts)

A one-sentence transition is fine: "From Doolin, the coast road clings to 200m cliffs for an hour
before dropping into the green calm of the Dingle Peninsula."

## Map: show the route, not just pins

The map SHOULD show the journey shape:
- Add the leg-hub coordinates to `route` in `guide-data`, in route order — this draws the route line.
- Set the line's color in the ROUTE polyline options — one route color.
- Markers still show individual stops, but the line gives the spatial story
- Consider numbered markers (1, 2, 3...) to show sequence

A dashed line suggests a route without implying exact roads.

## Data adaptation

All route data lives in the one `guide-data` island: the top-level `route` (and optional
`branches`) keys sit beside `items`, and each stop's items route to its own uniquely-named sections:

```json
{
  "items": [
    {"id": "d1", "category": "do", "section": "<leg-name>-do", ...},
    {"id": "f1", "category": "food", "section": "<leg-name>-food", ...}
  ],
  "route": [[53.27, -9.05], [52.97, -9.43], [52.14, -10.27]],
  "branches": []
}
```

Name each leg's sections after its stop; the leg's mounts carry the matching `data-section`.

## Branches: optional / alternative legs

When a route has side-trips, add-on extensions, or alternative legs the traveler might skip,
render them as **dashed, thinner, muted lines** — branches should be *visible but quiet* — a traveler's eye follows the main route first.

### Data shape

Add the branches to `branches` in `guide-data`, beside `route`:

```json
"branches": [
  { "label": "Aran Islands ferry",
    "coords": [[53.27, -9.05], [53.11, -9.64], [53.09, -9.78]],
    "color": "#999" }
]
```

Each branch's first coordinate SHOULD match a point on `route` — this is the junction where it
visually connects.

### Map note

Add a brief line below the map so the visual language is self-documenting. Name the branches in the note — don't force the reader to decode route colors unaided.

### When NOT to draw branches

- All legs are required (no meaningful "skip") — the `route` line is enough
- A branch is a single stop with no route — a regular marker handles it
- The "branch" is a completely separate trip — don't clutter the main map

## Design considerations

- Each leg can have a subtle visual marker (a colored left border, a numbered badge)
- The transition between legs should feel like movement — a separator that suggests distance
- The route overview at the top is a good place for data visualization (a timeline, a distance
  chart, a compact map thumbnail)
- Consider whether the hero shows the overall landscape or a single iconic stop
