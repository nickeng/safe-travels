# Day Trips

A region or day trip covers part of the trip that lies outside the base. How much weight it gets is
set by the **itinerary**: a place that is part of the suggested itinerary is a **mini-guide** — a full section
of its own, with substantial content; a place that is not part of the stated itinerary is an
**optional add-on** — kept light. Both cover the basics of reaching it: **getting there**
(mode, rough time, cost, whether to book) and **getting around** once there.

## Mini-guides

A destination in its own right: give it a section that reads like a small guide within the guide, and
let it use as much space as the place deserves — full prose, its own imagery, a schedule,
sub-sections. A good default shape is **see & do → eat**. Add a part only when the
region calls for it — a stop-by-stop schedule when the day needs sequencing, a dedicated food
sub-section when the place is a food draw of its own. In rare scenarios a stay sub-section can be added to a mini-guide if the trip could be significantly enhanced by the overnight stay itself (e.g. a night in a Hakone onsen).

### Showing places

Choose the unit at the scale the traveler makes the choice — then render each to match:

- **A whole town** you take in as one → show it as **content**: an editorial portrait with its own
  prose and imagery. Carry its `data-id` on the article so it still gets a single map pin.
- **Individual places** you pick among → show each as a **place card**, one map pin each.

A region can hold both — places you choose among, with a whole town written as content nested inside.

## Optional Add-ons

Kept light — a short, tempting pointer, not a full section. Always include images and write the content as the day you'd actually have, moving through it in order, so the reader can picture being there. Pick the treatment by **what's most important to show**:

| What's most important to show | Treatment |
|---|---|
| The vibe, one or two highlights | Editorial paragraph |
| Several distinct places | Stop list |
| The journey itself is the experience | Journey timeline |

### Editorial paragraph

Prose carries it — the most flexible treatment. For simple trips (1–2 highlights) this is all you need. Include:

- A kicker — the framing line above the title: how it slots in (e.g. "Worth the extra miles").
- The title
- The logistics on the line directly beneath it (e.g. "Train + ferry · 1.5 hr · Full day"), give it visual emphasis so its easy to scan.
- A short narrative — evocative scene-setting and imagery woven with practical, plannable detail (the price, the timing, the crowd-beating hour). Bold the stop names so the prose stays scannable; for a longer trip, break it into themed paragraphs.
- 1–5 images — lead with an establishing shot, then let each one show a different draw rather than a variation of the same view; only as many as earn their place.
- Optional: a 💡 tip when there's a non-obvious routing or timing insight (e.g. "start at X by 8 AM to beat buses").

### Stop list

When the trip has **4+ visually distinct stops** worth showing individually — each a row
with a thumbnail, title, short description, and a detail line. Number them (use `<ol>`) when
the order matters — a walking loop or set circuit; otherwise a plain `<ul>`. Photos stay on
the left (no alternating).

```html
<ol class="stops" role="list">
  <li class="stop" data-id="todaiji">
    <div class="num">1</div><!-- number them if the order matters -->
    <img src="..." alt="">
    <div>
      <h4>Tōdai-ji</h4>
      <p>World's largest wooden building. 15m bronze Buddha.</p>
      <div class="detail">¥600 · 1 hr · Opens 7:30 AM</div>
    </div>
  </li>
  <!-- more stops... -->
</ol>
```
```css
.stops{list-style:none;margin:0;padding:0}
.stop{display:grid;gap:0 .8rem;padding:.7rem 0;border-bottom:1px solid var(--line);align-items:start}
.stop{grid-template-columns:auto 90px 1fr}/* for plain list (ul) use: 90px 1fr */
.stop:not(:has(img)){grid-template-columns:1fr}/* for items missing image */
.stop .num{font-size:1.3rem;font-weight:700;color:var(--accent)}
.stop img{width:90px;height:65px;object-fit:cover;border-radius:5px}
.stop h4{font-size:.92rem;margin-bottom:.1rem}
.stop p{font-size:.82rem;color:var(--muted)}
.stop .detail{font-size:.72rem;color:var(--accent);margin-top:.2rem}
```

### Journey timeline

For **multi-leg transport routes** where the journey itself is the experience (
scenic railway routes, island-hopping). Each leg shows time, transport mode, and what you see.

```html
<div class="leg" data-id="bergen-voss">
  <div class="time">06:40</div>
  <div class="rail"><div class="dot"></div><div class="line"></div></div>
  <div class="body">
    <h4>Bergen → Voss</h4>
    <div class="mode">Bergen Railway · 1h 15m</div>
    <p>Lakes, forested valleys, mountain interior.</p>
  </div>
</div>
<!-- more legs... -->
```
```css
.leg{display:grid;grid-template-columns:55px 24px 1fr;gap:0 10px}
.leg .time{font-size:.72rem;color:var(--muted);text-align:right;padding-top:3px}
.leg .rail{display:flex;flex-direction:column;align-items:center}
.leg .dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--accent);background:var(--bg)}
.leg .line{width:2px;flex:1;background:var(--line);margin:3px 0}
.leg:last-child .line{display:none}
.leg .body{padding-bottom:1rem}
.leg .body .mode{font-size:.72rem;color:var(--accent)}
```

## Linking content to the map

A day-trip place shown as content still gets a map pin: give it an `items` entry — just `id`,
`name`, `lat`/`lng`, and `category` (optional: a `blurb` adds a second line to the pin's popup) — and
carry that id as `data-id` on the element that shows it:

- **A whole town or far destination** taken in as one gets a single pin — one `items` entry
  for the trip, `data-id` on the trip's title.
- **Individual places** the reader picks among get a pin each — one `items` entry per stop,
  `data-id` on the stop's `<li>` or `.leg` in a stop list or journey timeline; in prose, on
  the bolded (`<strong>`) name where the paragraph mentions the place.

Each item renders in exactly one place: as a card in a section (routed by `section`), or as
content carrying its `data-id` — one or the other per item.
